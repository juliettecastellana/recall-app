export async function POST(request) {
  try {
    const { text, type, count } = await request.json()

    if (!text || !type) {
      return Response.json({ error: 'Missing text or type' }, { status: 400 })
    }

    let prompt = ''
    if (type === 'flashcards') {
      prompt = `Create exactly ${count || 5} flashcards from the following text. Each flashcard should have a clear question and a concise answer. Use LaTeX notation wrapped in $ signs for any math — for example: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$. Always use LaTeX for fractions, square roots, exponents, and Greek letters.\n\nText: ${text}\n\nRespond ONLY as valid JSON, no markdown:\n[{"q":"question","a":"answer"}]`
    } else if (type === 'quiz') {
      prompt = `Create exactly ${count || 5} multiple choice quiz questions from the following text. Each question should have 4 options and one correct answer. For math, wrap in $ signs like $a_n = a_1 + (n-1)d$. Write subscripts as a_1, a_n etc inside $ signs. Never use bracket notation like a[1]. Never write raw LaTeX without $ delimiters.\n\nText: ${text}\n\nRespond ONLY as valid JSON, no markdown:\n[{"q":"question","options":["A","B","C","D"],"a":"correct option text"}]`
    } else if (type === 'sheet') {
      prompt = `Create exactly ${count || 5} key concept summaries from the following text. Use LaTeX wrapped in $ signs for any math expressions.\n\nText: ${text}\n\nRespond ONLY as valid JSON, no markdown:\n[{"q":"concept or term","a":"explanation"}]`
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You only respond with valid JSON arrays. No markdown. For any math expressions in questions, options, or explanations, always wrap them in $ signs like $x^2$ or $\\frac{n}{2}$. Never write raw LaTeX without $ delimiters.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    })

    const data = await response.json()

    if (!data.choices?.[0]?.message?.content) {
      return Response.json({ error: 'No response from AI' }, { status: 500 })
    }

    const content = data.choices[0].message.content.replace(/```json/g,'').replace(/```/g,'').trim()
    const cards = JSON.parse(content)

    return Response.json({ cards })
  } catch (err) {
    console.error('Generate API error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}