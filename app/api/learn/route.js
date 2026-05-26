export async function POST(request) {
  try {
    const { action, sets, subject, videoTitle, weakAreas, videoDurationSeconds, transcriptContext, existingSubjects } = await request.json()

    if (action === 'detect_subjects') {
      const setDescriptions = sets.map(s => {
        const cards = (s.cards||[]).slice(0,5).map(c => 'Q: ' + c.q).join(' | ')
        const score = s.score !== null && s.score !== undefined ? 'Score: ' + s.score + '%' : s.type === 'video' ? 'Video watched (counts as studied)' : 'Not studied'
        return 'Title: ' + s.title + ', Type: ' + s.type + ', ' + score + ', Sample: ' + cards
      }).join('\n')

      const existingNote = existingSubjects?.length
        ? 'If any sets clearly belong to one of these existing subjects, use that EXACT subject name: ' + existingSubjects.join(', ') + '. Do not create a new subject if one already exists with the same name.'
        : ''

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You only respond with valid JSON. No markdown. knowledgePercent must always be an integer between 0 and 100, never a string.' },
            { role: 'user', content: 'Analyze these study sets and group them into specific academic subjects. CRITICAL GROUPING RULES:\n1. Use the EXACT course name — "Algebra 2" not "Mathematics", "AP US History" not "History"\n2. Topics that are subtopics of a course MUST be grouped under that course. Examples: "Arithmetic and Geometric Sequences" → Algebra 2, "Factoring Polynomials" → Algebra 2, "Supply and Demand" → AP Microeconomics\n3. NEVER create a subject for a single topic like "Sequences" or "Factoring" — these are units within a course\n4. If you are unsure whether a set belongs to an existing subject, it almost certainly does — group it there\n5. Only create a NEW subject if the content is genuinely from a completely different course\n6. "AP Language and Composition", "AP English Language and Composition", "AP Lang" are ALL the same course — use "AP Language and Composition"\n7. Use the set TITLE to determine the course — if the title says "for Algebra 2" or "Algebra 2 curriculum", it belongs to Algebra 2\n' + existingNote + '\n\nUse scores AND video watch status to estimate knowledge (0-100 integer only). Write 1-2 sentences to the user using "you".\n\nSets:\n' + setDescriptions + '\n\nRespond ONLY as JSON:\n[{"subject":"Algebra 2","knowledgePercent":72,"setTitles":["title1","title2"],"weakAreas":["topic1"],"strongAreas":["topic2"],"analysis":"You have a solid grasp of quadratic functions but need more work on sequences and series."}]' }
          ],
          temperature: 0.3
        })
      })
      const data = await response.json()
      const content = data.choices[0].message.content.replace(/```json/g,'').replace(/```/g,'').trim()
      return Response.json({ subjects: JSON.parse(content) })
    }

    if (action === 'search_videos') {
      const focusQuery = weakAreas?.length > 0
        ? subject + ' ' + weakAreas.slice(0,2).join(' ') + ' explained tutorial'
        : subject + ' study tutorial explained'
      const query = encodeURIComponent(focusQuery)
      const res = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet,id&q=' + query + '&type=video&maxResults=6&relevanceLanguage=en&key=' + process.env.YOUTUBE_API_KEY)
      const searchData = await res.json()
      const videoIds = (searchData.items||[]).map(v => v.id.videoId).join(',')

      const detailRes = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=' + videoIds + '&key=' + process.env.YOUTUBE_API_KEY)
      const detailData = await detailRes.json()

      const videos = (detailData.items||[]).map(v => {
        const dur = v.contentDetails?.duration || 'PT0S'
        const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
        const seconds = (parseInt(match?.[1]||0)*3600) + (parseInt(match?.[2]||0)*60) + parseInt(match?.[3]||0)
        const mins = Math.floor(seconds/60)
        const secs = seconds % 60
        return {
          id: v.id,
          title: v.snippet.title,
          channel: v.snippet.channelTitle,
          thumbnail: v.snippet.thumbnails?.medium?.url,
          description: v.snippet.description?.slice(0,120),
          durationSeconds: seconds,
          durationLabel: mins + ':' + secs.toString().padStart(2,'0')
        }
      })
      return Response.json({ videos })
    }

    if (action === 'search_resources') {
      const focusTopic = weakAreas?.length > 0
        ? weakAreas.slice(0,2).join(' and ') + ' in ' + subject
        : subject

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You only respond with valid JSON. No markdown.' },
            { role: 'user', content: 'Suggest 4 free educational resources for a student studying "' + focusTopic + '". Weak areas to focus on: ' + (weakAreas?.join(', ')||subject) + '.\n\nCRITICAL: Only use these exact base URLs:\n- Khan Academy: https://www.khanacademy.org/search?page_search_query=TOPIC\n- OpenStax: https://openstax.org/subjects\n- Quizlet: https://quizlet.com/search?query=TOPIC&type=sets\n- Britannica: https://www.britannica.com/search?query=TOPIC\n\nDo NOT include any YouTube links. Text/practice resources only.\n\nRespond ONLY as JSON:\n[{"title":"Resource title","source":"Khan Academy","url":"https://...","description":"One sentence","type":"article|practice","focusArea":"which weak area this addresses"}]' }
          ],
          temperature: 0.2
        })
      })
      const data = await response.json()
      const content = data.choices[0].message.content.replace(/```json/g,'').replace(/```/g,'').trim()
      return Response.json({ resources: JSON.parse(content) })
    }

    if (action === 'generate_questions') {
      const durationSecs = videoDurationSeconds || 600
      const numQuestions = Math.max(1, Math.round(durationSecs / 45))
      const cappedQuestions = Math.min(numQuestions, 30)

      const timestamps = []
      for (let i = 0; i < cappedQuestions; i++) {
        const interval = durationSecs / cappedQuestions
        const t = Math.round(30 + i * interval + (Math.random() * 15 - 7))
        timestamps.push(Math.min(t, durationSecs - 30))
      }

      const weakFocus = weakAreas?.length > 0 ? 'Focus especially on these weak areas: ' + weakAreas.join(', ') + '.' : ''
      const transcriptPart = transcriptContext ? 'Transcript context:\n' + transcriptContext + '\n\n' : ''

      const prompt = 'Generate exactly ' + cappedQuestions + ' multiple choice questions for a student watching "' + videoTitle + '" (subject: "' + subject + '"). ' + weakFocus + '\n\nCRITICAL RULES:\n- Questions must be about the CONCEPT just taught, NOT about the video itself\n- NEVER mention "the video", "the instructor", "at X seconds", or anything meta\n- Each question should feel like a teacher paused and said "do you understand what we just covered?"\n- Only ask about things covered up to that timestamp\n- Ask practical concept-based questions: definitions, how to apply a method, what a term means\n\n' + transcriptPart + 'Use these exact timestamps (in seconds): ' + timestamps.join(', ') + '\n\nRespond ONLY as JSON:\n[{"q":"question text","options":["option1","option2","option3","option4"],"answer":"exact correct option text","timestamp":30,"explanation":"brief explanation"}]'

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You only respond with valid JSON. No markdown. For any math expressions in questions, options, or explanations, always wrap them in $ signs like $x^2$ or $\\frac{n}{2}$. Never write raw LaTeX without $ delimiters.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6
        })
      })
      const data = await response.json()
      const content = data.choices[0].message.content.replace(/```json/g,'').replace(/```/g,'').trim()
      return Response.json({ questions: JSON.parse(content) })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('Learn API error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
