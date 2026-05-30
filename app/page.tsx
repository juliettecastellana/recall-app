'use client'
import { useState, useEffect, useRef } from 'react'
import { SignInButton, SignOutButton, useUser, useAuth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

function sm2(card, quality) {
  let { interval = 1, repetitions = 0, easeFactor = 2.5 } = card
  if (quality >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easeFactor)
    repetitions += 1
  } else {
    repetitions = 0
    interval = 1
  }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)
  return { ...card, interval, repetitions, easeFactor, nextReview: nextReview.toDateString(), lastReview: new Date().toDateString() }
}

const THEMES = {
  ink: {
    name: 'Ink', bg: '#0d0d0d', s1: '#161616', s2: '#1f1f1f', s3: '#2a2a2a',
    border: '#343232f0', border2: '#ffffff18', text: '#f0ece4', text2: '#9a9080', text3: '#a5a8ac',
    accent: '#7c3aed', accentDim: '#7c3aed15', accentText: '#a78bfa',
    green: '#3b82f6', greenDim: '#3b82f612', amber: '#7c3aed', amberDim: '#7c3aed12',
    red: '#ef4444', redDim: '#ef444412',
  },
  abyss: {
    name: 'Abyss', bg: '#050714', s1: '#0a0d1f', s2: '#0f1429', s3: '#161c38',
    border: '#ffffff22', border2: '#ffffff1a', text: '#e8eaf6', text2: '#7986cb', text3: '#8b90aa',
    accent: '#7c6af7', accentDim: '#7c6af715', accentText: '#b3aaff',
    green: '#3b82f6', greenDim: '#3b82f612', amber: '#7c6af7', amberDim: '#7c6af712',
    red: '#f06292', redDim: '#f0629212',
  },
  pink: {
    name: 'Pink', bg: '#fdf0fd', s1: '#ffffff', s2: '#f7e8f7', s3: '#eddeed',
    border: '#dfcddfad', border2: '#d4b8d4', text: '#1a0f1a', text2: '#6b4f6b', text3: '#846b84',
    accent: '#a855f7', accentDim: '#a855f715', accentText: '#7c3aed',
    green: '#3b82f6', greenDim: '#3b82f612', amber: '#a855f7', amberDim: '#a855f712',
    red: '#dc2626', redDim: '#dc262612',
  },
  minimal: {
    name: 'Minimal', bg: '#ffffff', s1: '#fafafa', s2: '#f4f4f4', s3: '#e8e8e8',
    border: '#d8d1d1', border2: '#cccccc', text: '#0a0a0a', text2: '#444444', text3: '#716d6d',
    accent: '#0a0a0a', accentDim: '#0a0a0a08', accentText: '#0a0a0a',
    green: '#3b82f6', greenDim: '#3b82f612', amber: '#6d28d9', amberDim: '#6d28d912',
    red: '#dc2626', redDim: '#dc262612',
  },
  paper: {
    name: 'Paper', bg: '#f5f0e8', s1: '#fdfaf4', s2: '#ede8de', s3: '#ddd8ce',
    border: '#beb7a8bc', border2: '#b8af98', text: '#1c1a16', text2: '#5c5648', text3: '#8a8277',
    accent: '#2d6a4f', accentDim: '#2d6a4f15', accentText: '#1b4332',
    green: '#3b82f6', greenDim: '#3b82f612', amber: '#2d6a4f', amberDim: '#2d6a4f12',
    red: '#dc2626', redDim: '#dc262612',
  },
}

function MathText({ text }) {
  if (!text) return <span></span>
  const parts = text.split(/(\$[^$]+\$)/)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1)
          const fracMatch = math.match(/^\\frac\{([^}]+)\}\{([^}]+)\}$/)
          if (fracMatch) {
            const num = fracMatch[1].replace(/\\pm/g,'±').replace(/\\sqrt\{([^}]+)\}/g,'√($1)').replace(/\^2/g,'²').replace(/\^3/g,'³').replace(/\{|\}/g,'').replace(/\\/g,'')
            const den = fracMatch[2].replace(/\{|\}/g,'').replace(/\\/g,'')
            return (
              <span key={i} style={{display:'inline-flex',flexDirection:'column',alignItems:'center',verticalAlign:'middle',fontSize:'0.85em',lineHeight:'1.2',margin:'0 3px',fontFamily:'Georgia, serif',fontStyle:'italic'}}>
                <span style={{borderBottom:'1px solid currentColor',paddingBottom:'2px',textAlign:'center'}}>{num}</span>
                <span style={{paddingTop:'2px',textAlign:'center'}}>{den}</span>
              </span>
            )
          }
          const readable = math
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
            .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
            .replace(/\\pm/g, '±').replace(/\\times/g, '×').replace(/\\div/g, '÷')
            .replace(/\\Delta/g, 'Δ').replace(/\\delta/g, 'δ').replace(/\\pi/g, 'π')
            .replace(/\\theta/g, 'θ').replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β')
            .replace(/\\gamma/g, 'γ').replace(/\\lambda/g, 'λ').replace(/\\mu/g, 'μ')
            .replace(/\\sigma/g, 'σ').replace(/\\infty/g, '∞').replace(/\\neq/g, '≠')
            .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\approx/g, '≈')
            .replace(/\\cdot/g, '·').replace(/\\Leftrightarrow/g, '⟺')
            .replace(/\\leftrightarrow/g, '↔').replace(/\\Rightarrow/g, '⟹')
            .replace(/\\rightarrow/g, '→').replace(/\\leftarrow/g, '←')
            .replace(/\\left|\\right/g, '')
            .replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^4/g, '⁴')
            .replace(/\^x/g, 'ˣ').replace(/\^t/g, 'ᵗ').replace(/\^n/g, 'ⁿ')
            .replace(/\^\{([^}]+)\}/g, '^($1)').replace(/\^([a-zA-Z0-9]+)/g, '^$1')
            .replace(/_\{([^}]+)\}/g, '₍$1₎')
            .replace(/_(\w)/g, (_, c) => {
              const sub = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','n':'ₙ','i':'ᵢ','k':'ₖ'}
              return sub[c] || '[' + c + ']'
            })
            .replace(/\{|\}/g, '').replace(/\\/g, '')
          return <span key={i} style={{fontFamily:'Georgia, serif', fontStyle:'italic'}}>{readable}</span>
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

function localKey(userId) {
  return userId ? 'recall_data_' + userId : null
}

export default function Home() {
  const [screen, setScreen] = useState('dashboard')
  const [themeName, setThemeName] = useState('pink')
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [got, setGot] = useState(0)
  const [learning, setLearning] = useState(0)
  const [done, setDone] = useState(false)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [outputType, setOutputType] = useState('flashcards')
  const [cardCount, setCardCount] = useState(5)
  const [activeCards, setActiveCards] = useState(null)
  const [sessionCards, setSessionCards] = useState([])
  const [currentSetName, setCurrentSetName] = useState('')
  const [currentType, setCurrentType] = useState('flashcards')
  const [sets, setSets] = useState([])
  const [archivedSets, setArchivedSets] = useState([])
  const [setsCreated, setSetsCreated] = useState(0)
  const [streak, setStreak] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const [renamingIndex, setRenamingIndex] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [createTab, setCreateTab] = useState('ai')
  const [manualCards, setManualCards] = useState([{q:'', a:''}])
  const [manualSetName, setManualSetName] = useState('')
  const [editingCard, setEditingCard] = useState(null)
  const [editQ, setEditQ] = useState('')
  const [editA, setEditA] = useState('')
  const [sessionResults, setSessionResults] = useState([])
  const [generatingReview, setGeneratingReview] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const [subjects, setSubjects] = useState([])
  const [archivedSubjects, setArchivedSubjects] = useState([])
  const [showArchivedSubjects, setShowArchivedSubjects] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [videos, setVideos] = useState([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)
  const [videoQuestions, setVideoQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [watchedVideos, setWatchedVideos] = useState({})
  const [renamingSubject, setRenamingSubject] = useState(null)
  const [subjectRenameValue, setSubjectRenameValue] = useState('')
  const [questionAnswered, setQuestionAnswered] = useState(null)
  const [resources, setResources] = useState([])
  const [videoScore, setVideoScore] = useState(null)
  const [videoCorrect, setVideoCorrect] = useState(0)
  const [videoTotal, setVideoTotal] = useState(0)
  const videoProgressRef = useRef({})
  const [history, setHistory] = useState([])
  const [justSignedIn, setJustSignedIn] = useState(false)

  const menuRef = useRef(null)
  const playerRef = useRef(null)
  const wasFullscreen = useRef(false)

  const { user } = useUser()
  const { getToken } = useAuth()
  const C = THEMES[themeName]

  const getSupabase = async () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const prevUserRef = useRef(null)

  useEffect(() => {
    setSets([]); setArchivedSets([]); setSetsCreated(0); setStreak(0)
    setThemeName('pink'); setSubjects([])

    async function loadData() {
      if (!user) return

      prevUserRef.current = user

      try {
        const db = await getSupabase()
        const { data: row } = await db.from('sets').select('data').eq('user_id', user.id).maybeSingle()
        if (row?.data) {
          const d = row.data
          setSets(d.sets || []); setArchivedSets(d.archivedSets || [])
          setSetsCreated(d.setsCreated || 0); setStreak(d.streak || 0)
          if (d.theme && THEMES[d.theme]) setThemeName(d.theme)
          return
        }
      } catch (e) { console.log('Supabase load error:', e) }

      const key = localKey(user.id)
      if (!key) return
      try {
        const saved = localStorage.getItem(key)
        if (!saved) return
        const d = JSON.parse(saved)
        setSets(d.sets || []); setArchivedSets(d.archivedSets || [])
        setSetsCreated(d.setsCreated || 0); setStreak(d.streak || 0)
        if (d.theme && THEMES[d.theme]) setThemeName(d.theme)
      } catch (e) { console.log('localStorage load error:', e) }
    }

    loadData()
  }, [user])

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function save(newSets, newArchived, newCreated, newStreak, lastDate) {
    const data = {
      sets: newSets, archivedSets: newArchived, setsCreated: newCreated,
      streak: newStreak, lastStudyDate: lastDate || new Date().toDateString(), theme: themeName
    }
    if (user) {
      const key = localKey(user.id)
      if (key) { try { localStorage.setItem(key, JSON.stringify(data)) } catch (e) {} }
      try {
        const db = await getSupabase()
        await db.from('sets').upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      } catch (e) { console.log('Supabase save error:', e) }
    }
  }

  useEffect(() => {
    if (!activeVideo) return
    const handleMessage = (e) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.info?.currentTime && activeVideo) {
          const t = Math.floor(data.info.currentTime)
          videoProgressRef.current[activeVideo.id] = t
        }
      } catch {}
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [activeVideo])

  function changeTheme(t) {
    setThemeName(t)
    if (user) {
      const key = localKey(user.id)
      if (key) {
        try {
          const saved = localStorage.getItem(key)
          const d = saved ? JSON.parse(saved) : {}
          localStorage.setItem(key, JSON.stringify({...d, theme: t}))
        } catch (e) {}
      }
      getSupabase().then(db => {
        const key2 = localKey(user.id)
        if (!key2) return
        try {
          const saved = localStorage.getItem(key2)
          const d = saved ? JSON.parse(saved) : {}
          db.from('sets').upsert({ user_id: user.id, data: {...d, theme: t}, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        } catch (e) {}
      })
    }
  }

  function navigate(newScreen, extras?) {
    setHistory(h => [...h, { screen, selectedSubject, activeVideo }])
    if (extras?.subject !== undefined) setSelectedSubject(extras.subject)
    if (extras?.video !== undefined) setActiveVideo(extras.video)
    setScreen(newScreen)
  }

  function goBack() {
    const prev = history[history.length - 1]
    if (!prev) { setScreen('dashboard'); return }
    setHistory(h => h.slice(0, -1))
    setScreen(prev.screen)
    setSelectedSubject(prev.selectedSubject)
    setActiveVideo(prev.activeVideo)
    setCurrentQuestion(null); setQuestionAnswered(null); setVideoScore(null)
  }

  function pauseVideo() {
    wasFullscreen.current = !!document.fullscreenElement
    if (document.fullscreenElement) document.exitFullscreen()
    playerRef.current?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
  }

  function playVideo() {
    playerRef.current?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
    if (wasFullscreen.current) {
      const playerContainer = playerRef.current?.closest('div')
      if (playerContainer) setTimeout(() => playerContainer.requestFullscreen(), 100)
    }
  }

  function restart() {
    setCardIndex(0); setFlipped(false); setGot(0); setLearning(0)
    setDone(false); setQuizAnswers({}); setQuizSubmitted(false)
    setEditingCard(null); setSessionResults([])
  }

  function buildSession(cards) {
    const today = new Date().toDateString()
    return [...cards].sort((a, b) => {
      const aDue = !a.nextReview || a.nextReview <= today
      const bDue = !b.nextReview || b.nextReview <= today
      if (aDue && !bDue) return -1; if (!aDue && bDue) return 1; return 0
    })
  }

  function openSet(s) {
    restart()
    const cards = s.cards || []
    setActiveCards(cards); setCurrentSetName(s.title); setCurrentType(s.type)
    setSessionCards(buildSession(cards))
    const newSets = [s, ...sets.filter(e => e.title !== s.title)]
    setSets(newSets); save(newSets, archivedSets, setsCreated, streak, null)
    setTimeout(() => setScreen('study'), 10)
  }

  function archiveSet(i) {
    const s = sets[i]; const newSets = sets.filter((_, idx) => idx !== i); const newArchived = [s, ...archivedSets]
    setSets(newSets); setArchivedSets(newArchived); save(newSets, newArchived, setsCreated, streak, null); setOpenMenu(null)
  }

  function unarchiveSet(i) {
    const s = archivedSets[i]; const newArchived = archivedSets.filter((_, idx) => idx !== i); const newSets = [s, ...sets]
    setArchivedSets(newArchived); setSets(newSets); save(newSets, newArchived, setsCreated, streak, null)
  }

  function deleteSet(i) {
    const newSets = sets.filter((_, idx) => idx !== i)
    setSets(newSets); save(newSets, archivedSets, setsCreated, streak, null); setOpenMenu(null)
  }

  function startRename(i) { setRenamingIndex(i); setRenameValue(sets[i].title); setOpenMenu(null) }
  function submitRename(i) {
    if (!renameValue.trim()) return
    const newSets = sets.map((s, idx) => idx === i ? {...s, title: renameValue.trim()} : s)
    setSets(newSets); save(newSets, archivedSets, setsCreated, streak, null); setRenamingIndex(null)
  }

  function finishStudy(score, updatedCards) {
    const today = new Date().toDateString()
    const key = localKey(user?.id)
    const saved = key ? localStorage.getItem(key) : null
    const d = saved ? JSON.parse(saved) : {}
    const finalStreak = d.lastStudyDate === today ? streak : streak + 1
    if (finalStreak !== streak) setStreak(finalStreak)
    const cardsToSave = updatedCards || activeCards
    const newSets = sets.map(s => s.title === currentSetName ? {...s, score, cards: cardsToSave} : s)
    setSets(newSets)
    save(newSets, archivedSets, setsCreated, finalStreak, today)
    setDone(true)
  }

  function submitQuiz() {
    const score = Math.round((activeCards.filter((c, i) => quizAnswers[i] === c.a).length / activeCards.length) * 100)
    finishStudy(score, activeCards); setQuizSubmitted(true)
  }

  function startEditCard(i) {
    setEditingCard(i)
    setEditQ(sessionCards[i] ? sessionCards[i].q : activeCards[i].q)
    setEditA(sessionCards[i] ? sessionCards[i].a : activeCards[i].a)
  }

  function saveEditCard() {
    if (!editQ.trim() || !editA.trim()) return
    const updatedQ = editQ.trim(); const updatedA = editA.trim()
    const newSessionCards = sessionCards.map((c, i) => i === editingCard ? {...c, q: updatedQ, a: updatedA} : c)
    setSessionCards(newSessionCards)
    const targetCard = sessionCards[editingCard]
    const newActiveCards = activeCards.map(c => c.q === targetCard.q ? {...c, q: updatedQ, a: updatedA} : c)
    setActiveCards(newActiveCards)
    const newSets = sets.map(s => s.title === currentSetName ? {...s, cards: newActiveCards} : s)
    setSets(newSets); save(newSets, archivedSets, setsCreated, streak, null); setEditingCard(null)
  }

  function answerCard(quality) {
    const currentCard = sessionCards[cardIndex]
    const updatedCard = sm2(currentCard, quality)
    const newActiveCards = activeCards.map(c => c.q === currentCard.q ? updatedCard : c)
    setActiveCards(newActiveCards)
    const newResults = [...sessionResults, { card: currentCard, quality }]
    setSessionResults(newResults)
    if (quality <= 2) setLearning(l => l + 1); else setGot(g => g + 1)
    setFlipped(false)
    setTimeout(() => {
      if (quality === 0) {
        const remaining = [...sessionCards]
        remaining.splice(Math.min(cardIndex + 3, remaining.length), 0, updatedCard)
        setSessionCards(remaining); setCardIndex(i => i + 1)
      } else if (cardIndex + 1 >= sessionCards.length) {
        const finalGot = newResults.filter(r => r.quality >= 3).length
        finishStudy(Math.round((finalGot / newResults.length) * 100), newActiveCards)
      } else { setCardIndex(i => i + 1) }
    }, 100)
  }

  async function studyWeakCards() {
    const weakCards = sessionResults.filter(r => r.quality <= 2).map(r => r.card)
    if (weakCards.length === 0) return
    setGeneratingReview(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `The student struggled with these concepts:\n\n${weakCards.map(c => `Q: ${c.q}\nA: ${c.a}`).join('\n\n')}\n\nCreate NEW questions from completely different angles.`, type: 'flashcards', count: weakCards.length })
      })
      const data = await res.json()
      if (!data.cards?.length) throw new Error('No cards')
      setSessionCards(data.cards); setSessionResults([]); setCardIndex(0); setFlipped(false); setGot(0); setLearning(0); setDone(false)
    } catch (e) { alert('Could not generate review cards. Try again.') }
    setGeneratingReview(false)
  }

  async function detectSubjects(setsToUse) {
    const data = setsToUse || sets
    if (data.length === 0) return
    setLoadingSubjects(true)
    try {
      const res = await fetch('/api/learn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detect_subjects', sets: data, existingSubjects: subjects.map(s => s.subject) })
      })
      const result = await res.json()
      const newSubjects = result.subjects || []
      setSubjects(prev => {
        const merged = [...prev]
        newSubjects.forEach(ns => {
          const cleaned = { ...ns, knowledgePercent: typeof ns.knowledgePercent === 'number' ? ns.knowledgePercent : parseInt(ns.knowledgePercent) || 0 }
          const existingIdx = merged.findIndex(s => {
            const a = s.subject.toLowerCase().replace(/[^a-z0-9\s]/g,'').trim()
            const b = cleaned.subject.toLowerCase().replace(/[^a-z0-9\s]/g,'').trim()
            if (a === b) return true
            const shorter = a.length < b.length ? a : b
            const longer = a.length < b.length ? b : a
            return shorter.length >= 8 && longer.includes(shorter)
          })
          if (existingIdx >= 0) merged[existingIdx] = { ...merged[existingIdx], ...cleaned }
          else merged.push(cleaned)
        })
        return merged
      })
    } catch (e) { console.log('Subject detection error:', e) }
    setLoadingSubjects(false)
  }

  useEffect(() => {
    if (screen === 'learn' && sets.length > 0 && subjects.length === 0 && !loadingSubjects) detectSubjects(sets)
  }, [screen, sets, subjects.length])

  async function loadVideos(subject) {
    setSelectedSubject(subject); setVideos([]); setActiveVideo(null)
    setVideoQuestions([]); setResources([]); setVideoScore(null)
    setLoadingVideos(true)
    try {
      const [videoRes, resourceRes] = await Promise.all([
        fetch('/api/learn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'search_videos', subject: subject.subject, weakAreas: subject.weakAreas }) }),
        fetch('/api/learn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'search_resources', subject: subject.subject, weakAreas: subject.weakAreas }) })
      ])
      const videoData = await videoRes.json(); const resourceData = await resourceRes.json()
      setVideos(videoData.videos || []); setResources(resourceData.resources || [])
    } catch (e) { console.log('Video/resource search error:', e) }
    setLoadingVideos(false)
  }

  async function openVideo(video, subjectOverride?) {
    setActiveVideo(video); setVideoQuestions([]); setCurrentQuestion(null)
    setQuestionAnswered(null); setVideoScore(null); setVideoCorrect(0); setVideoTotal(0)
    const inProgressSet = {
      title: `${video.title.slice(0,40)}${video.title.length>40?'...':''}`,
      type: 'video', typeLabel: 'Video', count: 0, cards: [],
      date: new Date().toDateString(), score: null, videoId: video.id,
      videoProgress: { answered: 0, total: 0, inProgress: true }, color: C.accent
    }
    const newSets = [inProgressSet, ...sets.filter(s => s.videoId !== video.id)]
    const newCreated = setsCreated + 1
    setSets(newSets); setSetsCreated(newCreated); save(newSets, archivedSets, newCreated, streak, null)
    try {
      let transcriptSegments = []
      try {
        const tRes = await fetch('/api/learn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_transcript', videoId: video.id }) })
        const tData = await tRes.json(); transcriptSegments = tData.transcript || []
      } catch (e) {}
      const durationSecs = video.durationSeconds || 600
      const numQuestions = Math.max(1, Math.min(Math.round(durationSecs / 45), 30))
      const chunkSize = durationSecs / numQuestions
      let transcriptContext = ''
      if (transcriptSegments.length > 0) {
        for (let i = 0; i < numQuestions; i++) {
          const chunkStart = i * chunkSize
          const chunkText = transcriptSegments.filter(s => s.start >= chunkStart && s.start < chunkStart + chunkSize).map(s => s.text).join(' ').trim()
          if (chunkText) { const mins = Math.floor(chunkStart / 60); const secs = Math.round(chunkStart % 60); transcriptContext += `[${mins}:${secs.toString().padStart(2,'0')}] ${chunkText}\n` }
        }
      }
      const activeSubject = subjectOverride || selectedSubject
      const res = await fetch('/api/learn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate_questions', subject: activeSubject?.subject || 'General', videoTitle: video.title, weakAreas: activeSubject?.weakAreas || [], videoDurationSeconds: durationSecs, transcriptContext: transcriptContext || null }) })
      const data = await res.json()
      const questions = data.questions || []
      setVideoQuestions(questions); setVideoTotal(questions.length)
      const updatedSets = newSets.map(s => s.videoId === video.id ? {...s, count: questions.length, cards: questions.map(q=>({q:q.q,a:q.answer})), videoProgress: {answered:0, total:questions.length, inProgress:true}} : s)
      setSets(updatedSets); save(updatedSets, archivedSets, newCreated, streak, null)
      if (questions.length > 0) {
        questions.forEach((q) => { setTimeout(() => { setCurrentQuestion(q); pauseVideo() }, (q.timestamp || 30) * 1000) })
      }
    } catch (e) { console.log('Question generation error:', e) }
  }

  function answerVideoQuestion(option) {
    if (!currentQuestion) return
    const correct = option === currentQuestion.answer
    setQuestionAnswered(correct ? 'correct' : 'wrong')
    const newCorrect = correct ? videoCorrect + 1 : videoCorrect
    if (correct) setVideoCorrect(newCorrect)
    const currentIdx = videoQuestions.findIndex(q => q.q === currentQuestion.q)
    const answeredCount = currentIdx + 1
    const currentScore = Math.round(((videoCorrect + (correct ? 1 : 0)) / answeredCount) * 100)
    setSets(prev => prev.map(s => s.videoId === activeVideo?.id ? {...s, score: currentScore, videoProgress: {answered: answeredCount, total: videoQuestions.length, inProgress: answeredCount < videoQuestions.length}} : s))
    if (currentIdx === videoQuestions.length - 1) {
      const finalScore = Math.round((newCorrect / videoQuestions.length) * 100)
      setVideoScore(finalScore)
      const correctQs = videoQuestions.filter((q,i) => i < currentIdx)
      const incorrectQs = []
      videoQuestions.forEach((q, i) => { if (i === currentIdx) { if (correct) correctQs.push(q); else incorrectQs.push({...q, userAnswer: option}) } })
      const finalSets = sets.map(s => s.videoId === activeVideo?.id ? {...s, score: finalScore, videoProgress: {answered: videoQuestions.length, total: videoQuestions.length, inProgress: false}} : s)
      setSets(finalSets); save(finalSets, archivedSets, setsCreated, streak, null)
      if (selectedSubject) {
        const subjectData = subjects.find(s => s.subject === selectedSubject.subject)
        fetch('/api/learn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'analyze_video_results', subject: selectedSubject.subject, correct: correctQs, incorrect: incorrectQs, currentKnowledge: subjectData?.knowledgePercent || 50, currentWeak: subjectData?.weakAreas || [], currentStrong: subjectData?.strongAreas || [] }) })
          .then(r => r.json()).then(analysis => {
            if (analysis.newKnowledgePercent !== undefined) {
              setSubjects(prev => prev.map(s => s.subject === selectedSubject.subject ? { ...s, knowledgePercent: analysis.newKnowledgePercent, weakAreas: analysis.newWeakAreas || s.weakAreas, strongAreas: analysis.newStrongAreas || s.strongAreas, analysis: analysis.analysis || s.analysis } : s))
            }
          }).catch(e => console.log('Analysis error:', e))
      }
    }
  }

  function addManualCard() { setManualCards(c => [...c, {q:'', a:''}]) }
  function updateManualCard(i, field, val) { setManualCards(cards => cards.map((c, idx) => idx === i ? {...c, [field]: val} : c)) }
  function removeManualCard(i) { if (manualCards.length === 1) return; setManualCards(c => c.filter((_, idx) => idx !== i)) }

  function saveManualSet() {
    const validCards = manualCards.filter(c => c.q.trim() && c.a.trim())
    if (validCards.length === 0) return alert('Add at least one complete card')
    const name = manualSetName.trim() || 'My set'
    const newSet = { title: name, type: 'flashcards', count: validCards.length, cards: validCards, date: new Date().toDateString(), score: null, color: C.accent, typeLabel: 'Flashcards' }
    const newSets = [newSet, ...sets]; const newCreated = setsCreated + 1
    setSets(newSets); setSetsCreated(newCreated); save(newSets, archivedSets, newCreated, streak, null)
    setActiveCards(validCards); setCurrentSetName(name); setCurrentType('flashcards')
    setSessionCards(buildSession(validCards)); setManualCards([{q:'', a:''}]); setManualSetName('')
    restart(); setScreen('study')
  }

  async function generate() {
    if (!inputText.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: inputText, type: outputType, count: cardCount }) })
      const data = await res.json()
      const newCards = data.cards
      const name = inputText.slice(0, 40).trim() + (inputText.length > 40 ? '...' : '')
      const newSet = { title: name, type: outputType, count: newCards.length, cards: newCards, date: new Date().toDateString(), score: null, color: outputType === 'flashcards' ? C.accent : outputType === 'quiz' ? C.amber : C.green, typeLabel: outputType === 'flashcards' ? 'Flashcards' : outputType === 'quiz' ? 'Quiz' : 'Study sheet' }
      const newSets = [newSet, ...sets]; const newCreated = setsCreated + 1
      setSets(newSets); setSetsCreated(newCreated); save(newSets, archivedSets, newCreated, streak, null)
      setActiveCards(newCards); setCurrentSetName(name); setCurrentType(outputType)
      if (outputType === 'flashcards') setSessionCards(buildSession(newCards))
      restart(); setScreen('study')
    } catch (e) { alert('Something went wrong, try again') }
    setLoading(false)
  }

  function scoreColor(score) {
    if (score === null || score === undefined) return C.border
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  function knowledgeColor(pct) {
    if (pct >= 75) return '#22c55e'
    if (pct >= 45) return '#f59e0b'
    return '#ef4444'
  }

  const card = sessionCards[cardIndex] || null
  const progress = sessionCards.length > 0 ? (cardIndex / sessionCards.length) * 100 : 0
  const quizScore = quizSubmitted ? (activeCards || []).filter((c, i) => quizAnswers[i] === c.a).length : 0
  const flashcardStudied = [...sets, ...archivedSets].filter(s => s.type === 'flashcards').reduce((a, s) => a + (s.count || 0), 0)
  const weakCardsCount = sessionResults.filter(r => r.quality <= 2).length
  const howMany = outputType === 'flashcards' ? 'How many flashcards?' : outputType === 'quiz' ? 'How many questions?' : 'How many terms?'
  const serifStyle = { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: '400' }
  const labelStyle = { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: '400', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.06em' }
  const setLabelStyle = { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: '400', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.03em' }

  const btn = (onClick, children, style={}) => (
    <button onClick={onClick} style={{ padding:'9px 18px', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer', border:`1px solid ${C.border2}`, background:C.s2, color:C.text2, fontFamily:'inherit', transition:'all .15s', ...style }}>{children}</button>
  )
  const btnPrimary = (onClick, children, style={}) => (
    <button onClick={onClick} style={{ padding:'9px 18px', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer', border:'none', background:C.accent, color:'white', fontFamily:'inherit', transition:'all .15s', ...style }}>{children}</button>
  )

  function navTo(id) {
    setHistory([])
    setScreen(id)
    if (id !== 'study') restart()
    if (id === 'learn' && sets.length > 0 && subjects.length === 0) detectSubjects(sets)
  }

  return (
    <div style={{display:'flex', flexDirection:'column', minHeight:'100vh', background:C.bg, color:C.text, fontFamily:"'Inter', system-ui, sans-serif", transition:'background .2s, color .2s'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .card-scene{width:100%;height:300px;perspective:1200px;cursor:pointer;margin-bottom:16px;}
        @media(min-width:640px){.card-scene{height:360px;}}
        .card-flipper{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform 0.38s cubic-bezier(0.4,0,0.2,1);}
        .card-flipper.flipped{transform:rotateY(180deg);}
        .card-face{position:absolute;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;box-sizing:border-box;}
        @media(min-width:640px){.card-face{padding:40px;}}
        .card-front{background:${C.s1};border:2px solid ${C.border2};}
        .card-back{background:${C.s2};border:2px solid ${C.accent}40;transform:rotateY(180deg);}
        .opt-btn{width:100%;padding:13px 18px;border-radius:10px;font-size:14px;text-align:left;cursor:pointer;font-family:inherit;border:2px solid ${C.border};background:${C.s1};color:${C.text};margin-bottom:8px;transition:all .15s;}
        .opt-btn:hover{border-color:${C.accent};background:${C.accentDim};}
        .opt-btn.selected{border-color:${C.accent};background:${C.accentDim};color:${C.accentText};}
        .set-card{background:${C.s1};border-radius:16px;padding:14px;position:relative;cursor:pointer;transition:all .15s;border:2px solid ${C.border};}
        .set-card:hover{border-color:${C.border2};background:${C.s2};}
        .menu-btn{background:transparent;border:none;color:${C.text3};cursor:pointer;font-size:16px;padding:4px 8px;border-radius:5px;line-height:1;font-family:inherit;letter-spacing:2px;}
        .menu-btn:hover{background:${C.s3};color:${C.text};}
        .dropdown{position:absolute;top:38px;right:8px;background:${C.s2};border:1px solid ${C.border2};border-radius:12px;overflow:hidden;z-index:100;min-width:130px;box-shadow:0 8px 32px #00000020;}
        .dropdown-item{padding:11px 14px;font-size:14px;cursor:pointer;transition:background .1s;color:${C.text2};}
        .dropdown-item:hover{background:${C.s3};color:${C.text};}
        .rename-input{width:100%;background:${C.bg};border:2px solid ${C.accent};border-radius:8px;padding:6px 10px;color:${C.text};font-size:13px;outline:none;font-family:inherit;box-sizing:border-box;}
        .tab-btn{flex:1;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;font-family:inherit;transition:all .15s;}
        .inp{width:100%;background:${C.s1};border:2px solid ${C.border2};border-radius:10px;padding:12px 14px;color:${C.text};font-size:14px;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .15s;}
        .inp:focus{border-color:${C.accent};}
        .inp::placeholder{color:${C.text3};}
        .edit-overlay{position:fixed;inset:0;background:#00000060;display:flex;align-items:flex-end;justify-content:center;z-index:200;backdrop-filter:blur(2px);}
        @media(min-width:640px){.edit-overlay{align-items:center;}}
        .edit-modal{background:${C.s1};border:2px solid ${C.border2};border-radius:18px 18px 0 0;padding:24px;width:100%;max-width:500px;}
        @media(min-width:640px){.edit-modal{border-radius:18px;}}
        .sm2-btn{flex:1;padding:12px 4px;border-radius:10px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;border:none;transition:all .15s;text-align:center;}
        @media(min-width:400px){.sm2-btn{font-size:13px;padding:12px 6px;}}
        .sm2-btn:hover{filter:brightness(1.1);}
        textarea{background:${C.s1};border:2px solid ${C.border2};border-radius:10px;padding:14px 16px;color:${C.text};font-size:14px;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .15s;resize:vertical;}
        textarea:focus{border-color:${C.accent};}
        textarea::placeholder{color:${C.text3};}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;height:64px;background:${C.s1};border-top:1px solid ${C.border};z-index:50;display:flex;align-items:center;justify-content:space-around;padding:0 4px;}
        .bnav-item{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;padding:8px 10px;border-radius:10px;flex:1;transition:all .15s;}
        .desktop-sidebar{display:none;}
        @media(min-width:768px){
          .bottom-nav{display:none;}
          .desktop-sidebar{display:flex;flex-direction:column;flex-shrink:0;width:210px;background:${C.s1};border-right:1px solid ${C.border};padding:24px 0;min-height:100vh;position:sticky;top:0;height:100vh;overflow-y:auto;}
          .app-layout{flex-direction:row !important;}
          .main-scroll{padding-bottom:0 !important;}
        }
        .main-scroll{flex:1;overflow-y:auto;padding-bottom:64px;}
        @media(min-width:768px){.main-scroll{padding-bottom:0;}}
        .nav-item{padding:9px 20px;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s;border-left:2px solid transparent;}
        .nav-item:hover{background:${C.s2};}
        .nav-item.active{color:${C.text};background:${C.accentDim};border-left:2px solid ${C.accent};}
        .nav-item.inactive{color:${C.text2};}
        .grid-1{display:grid;grid-template-columns:1fr;gap:10px;}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .grid-3{display:grid;grid-template-columns:1fr;gap:10px;}
        @media(min-width:640px){.grid-2{grid-template-columns:1fr 1fr;}.grid-3{grid-template-columns:repeat(2,1fr);}}
        @media(min-width:900px){.grid-3{grid-template-columns:repeat(3,1fr);}}
        .page-pad{padding:20px 16px;}
        @media(min-width:640px){.page-pad{padding:36px 40px;}}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${C.s3};border-radius:3px;}
      `}</style>

      {/* Edit card modal */}
      {editingCard !== null && (
        <div className="edit-overlay" onClick={() => setEditingCard(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div style={{fontSize:'18px',marginBottom:'20px',...serifStyle}}>Edit card</div>
            <div style={{marginBottom:'12px'}}>
              <div style={{...labelStyle,color:C.text3,marginBottom:'6px'}}>Question</div>
              <textarea value={editQ} onChange={e => setEditQ(e.target.value)} style={{width:'100%',minHeight:'80px'}}/>
            </div>
            <div style={{marginBottom:'20px'}}>
              <div style={{...labelStyle,color:C.text3,marginBottom:'6px'}}>Answer</div>
              <textarea value={editA} onChange={e => setEditA(e.target.value)} style={{width:'100%',minHeight:'80px'}}/>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              {btnPrimary(saveEditCard,'Save changes',{flex:1,padding:'12px'})}
              {btn(() => setEditingCard(null),'Cancel')}
            </div>
          </div>
        </div>
      )}

      <div className="app-layout" style={{display:'flex',flex:1}}>

        {/* Desktop sidebar */}
        <div className="desktop-sidebar">
          <div style={{padding:'0 20px 28px',fontSize:'20px',...serifStyle,color:C.text}}>Recall</div>
          <div style={{height:'16px'}}></div>
          {[['dashboard','Dashboard'],['create','Create'],['study','Study']].map(([id,label]) => (
            <div key={id} className={`nav-item ${screen===id?'active':'inactive'}`} onClick={() => navTo(id)}>{label}</div>
          ))}
          <div style={{height:'1px',background:C.border,margin:'12px 0'}}></div>
          <div className={`nav-item ${screen==='learn'?'active':'inactive'}`} onClick={() => navTo('learn')} style={{fontSize:'15px',fontWeight:'600',letterSpacing:'-0.01em'}}>✨ Recall Map</div>
          <div style={{height:'1px',background:C.border,margin:'12px 0'}}></div>
          <div className={`nav-item ${screen==='settings'?'active':'inactive'}`} onClick={() => setScreen('settings')}>Settings</div>
          <div style={{marginTop:'auto',padding:'16px 20px 0',borderTop:`1px solid ${C.border}`}}>
            {user ? (
              <div style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}} onClick={() => setScreen('settings')}>
                {user.imageUrl
                  ? <img src={user.imageUrl} alt="avatar" style={{width:'28px',height:'28px',borderRadius:'50%',objectFit:'cover',border:`1px solid ${C.border2}`}}/>
                  : <div style={{width:'28px',height:'28px',borderRadius:'50%',background:C.accentDim,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'600',color:C.accent}}>{(user.firstName?.[0]||'?').toUpperCase()}</div>
                }
                <div>
                  <div style={{fontSize:'12px',fontWeight:'500',color:C.text}}>{user.firstName||'Account'}</div>
                  <div style={{fontSize:'10px',color:C.text3}}>View settings</div>
                </div>
              </div>
            ) : (
              <SignInButton mode="modal">
                <div style={{fontSize:'13px',color:C.text3,cursor:'pointer',fontWeight:'500'}}>Sign in</div>
              </SignInButton>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="main-scroll">

          {/* DASHBOARD */}
          {screen==='dashboard'&&(
            <div className="page-pad" style={{width:'100%'}}>
              <h1 style={{fontSize:'28px',marginBottom:'4px',...serifStyle}}>Dashboard</h1>
              <p style={{fontSize:'13px',color:C.text3,marginBottom:'24px'}}>
                {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
              </p>
              <div className="grid-3" style={{marginBottom:'24px'}}>
                {[{label:'Sets created',val:setsCreated},{label:'Cards studied',val:flashcardStudied},{label:'Day streak',val:streak}].map(s => (
                  <div key={s.label} style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'14px 16px'}}>
                    <div style={{...serifStyle,fontSize:'12px',color:C.text3,marginBottom:'6px'}}>{s.label}</div>
                    <div style={{fontSize:'24px',fontWeight:'300',color:C.text,...serifStyle}}>{s.val}</div>
                  </div>
                ))}
              </div>

              {!user ? (
                <div style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'40px 24px',textAlign:'center'}}>
                  <div style={{fontSize:'18px',fontWeight:'500',marginBottom:'8px',...serifStyle}}>Welcome to Recall</div>
                  <div style={{fontSize:'14px',color:C.text3,marginBottom:'20px'}}>Sign in to save your sets and track your progress.</div>
                  <button onClick={()=>setScreen('settings')} style={{padding:'10px 24px',background:C.accent,border:'none',borderRadius:'8px',color:'white',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',fontWeight:'500'}}>Sign in</button>
                </div>
              ) : sets.length===0&&archivedSets.length===0 ? (
                <div style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'40px 24px',textAlign:'center'}}>
                  <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'6px'}}>No sets yet</div>
                  <div style={{fontSize:'13px',color:C.text3,marginBottom:'20px'}}>Create your first set to get started</div>
                  {btnPrimary(()=>setScreen('create'),'Create a set',{padding:'12px 24px',fontSize:'14px'})}
                </div>
              ) : (
                <>
                  {sets.length>0&&(
                    <>
                      <div style={{...serifStyle,fontSize:'13px',color:C.text3,marginBottom:'12px'}}>Study sets</div>
                      <div className="grid-3" ref={menuRef}>
                        {sets.map((s,i)=>{
                          const due = s.type==='video' ? (s.videoProgress?.inProgress ? (s.videoProgress.total - s.videoProgress.answered) : 0) : s.type==='flashcards' ? (s.cards||[]).filter(c => !c.nextReview || c.nextReview<=new Date().toDateString()).length : 0
                          return (
                            <div key={i} className="set-card" style={{borderLeft:`3px solid ${scoreColor(s.score)}`}}>
                              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'8px'}}>
                                <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                                  <span style={{...setLabelStyle,color:C.text3}}>{s.typeLabel}</span>
                                  {s.score!==null&&s.score!==undefined&&<span style={{fontSize:'10px',fontWeight:'600',color:scoreColor(s.score)}}>{s.score}%</span>}
                                  {due>0&&<span style={{fontSize:'10px',fontWeight:'500',color:'#f59e0b'}}>{due} due</span>}
                                </div>
                                <button className="menu-btn" onClick={e=>{e.stopPropagation();setOpenMenu(openMenu===i?null:i)}}>···</button>
                              </div>
                              {renamingIndex===i ? (
                                <div>
                                  <input className="rename-input" value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitRename(i);if(e.key==='Escape')setRenamingIndex(null)}} autoFocus/>
                                  <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                                    {btnPrimary(()=>submitRename(i),'Save',{padding:'8px 14px',fontSize:'13px'})}
                                    {btn(()=>setRenamingIndex(null),'Cancel',{padding:'8px 14px',fontSize:'13px'})}
                                  </div>
                                </div>
                              ) : (
                                <div onClick={async () => {
                                  if (s.type==='video') {
                                    navigate('learn')
                                    if (s.videoId) {
                                      const matchedSubject = subjects.find(sub => sub.subject === selectedSubject?.subject) || subjects[0] || null
                                      setSelectedSubject(matchedSubject)
                                      const fakeVideo = { id: s.videoId, title: s.title, durationSeconds: 600, durationLabel: '' }
                                      await openVideo(fakeVideo, matchedSubject)
                                    }
                                  } else { openSet(s) }
                                }} style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                                  {s.type==='video'&&s.videoId&&(
                                    <div style={{width:'80px',height:'54px',flexShrink:0,borderRadius:'6px',overflow:'hidden'}}>
                                      <img src={`https://img.youtube.com/vi/${s.videoId}/mqdefault.jpg`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                    </div>
                                  )}
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'3px',color:C.text,lineHeight:'1.3'}}>{s.title}</div>
                                    <div style={{fontSize:'11px',color:C.text3}}>{s.date}</div>
                                    {s.score!==null&&s.score!==undefined&&(
                                      <div style={{height:'2px',background:C.s3,borderRadius:'2px',marginTop:'8px'}}>
                                        <div style={{height:'100%',width:`${s.score}%`,background:scoreColor(s.score),borderRadius:'2px'}}></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {openMenu===i&&(
                                <div className="dropdown">
                                  <div className="dropdown-item" onClick={()=>startRename(i)}>Rename</div>
                                  <div className="dropdown-item" onClick={()=>archiveSet(i)} style={{color:C.amber}}>Archive</div>
                                  <div className="dropdown-item" onClick={()=>deleteSet(i)} style={{color:C.red}}>Delete</div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                  {archivedSets.length>0&&(
                    <div style={{marginTop:'24px'}}>
                      <div onClick={()=>setShowArchived(a=>!a)} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px',cursor:'pointer',userSelect:'none'}}>
                        <div style={{...serifStyle,fontSize:'13px',color:C.text3}}>Archived — {archivedSets.length}</div>
                        <div style={{fontSize:'11px',color:C.text3}}>{showArchived?'▲':'▼'}</div>
                      </div>
                      {showArchived&&(
                        <div className="grid-1">
                          {archivedSets.map((s,i)=>(
                            <div key={i} style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'14px',opacity:0.6}}>
                              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'8px'}}>
                                <span style={{...setLabelStyle,color:C.text3}}>{s.typeLabel}</span>
                                <button onClick={()=>unarchiveSet(i)} style={{background:'transparent',border:`1px solid ${C.border2}`,borderRadius:'6px',padding:'4px 10px',color:C.text2,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>Restore</button>
                              </div>
                              <div onClick={()=>openSet(s)} style={{cursor:'pointer'}}>
                                <div style={{fontSize:'14px',fontWeight:'500'}}>{s.title}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* CREATE */}
          {screen==='create'&&(
            <div className="page-pad" style={{width:'100%',maxWidth:'800px',margin:'0 auto'}}>
              <div style={{textAlign:'center',marginBottom:'24px'}}>
                <h1 style={{fontSize:'28px',marginBottom:'6px',...serifStyle}}>Create</h1>
                <p style={{fontSize:'14px',color:C.text3}}>Generate with AI or build manually.</p>
              </div>
              {!user && (
                <div style={{background:C.accentDim,border:`1px solid ${C.accent}40`,borderRadius:'12px',padding:'14px 18px',marginBottom:'20px',fontSize:'13px',color:C.accentText}}>
                  Sign in to save your sets across sessions.
                </div>
              )}
              <div style={{display:'flex',gap:'4px',marginBottom:'20px',background:C.s1,padding:'3px',borderRadius:'10px',border:`2px solid ${C.border}`}}>
                <button className="tab-btn" onClick={()=>setCreateTab('ai')} style={{background:createTab==='ai'?C.s2:'transparent',color:createTab==='ai'?C.text:C.text2,border:createTab==='ai'?`1px solid ${C.border2}`:'1px solid transparent'}}>AI Generate</button>
                <button className="tab-btn" onClick={()=>setCreateTab('manual')} style={{background:createTab==='manual'?C.s2:'transparent',color:createTab==='manual'?C.text:C.text2,border:createTab==='manual'?`1px solid ${C.border2}`:'1px solid transparent'}}>Manual</button>
              </div>
              {createTab==='ai'&&(
                <>
                  <textarea value={inputText} onChange={e=>setInputText(e.target.value)} placeholder="Paste your notes, textbook excerpt, or any text here..." style={{width:'100%',minHeight:'220px',marginBottom:'14px',lineHeight:'1.7',fontSize:'15px'}}/>
<div className="grid-3" style={{marginBottom:'16px'}}>
  {[['flashcards','Flashcards','Terms & definitions'],['quiz','Quiz','Multiple choice'],['sheet','Study sheet','Key points']].map(([id,name,desc])=>(
    <div key={name} onClick={()=>setOutputType(id)} style={{background:outputType===id?C.accentDim:C.s1,border:`2px solid ${outputType===id?C.accent:C.border}`,borderRadius:'10px',padding:'8px 6px',textAlign:'center',cursor:'pointer',transition:'all .15s'}}>
      <div style={{fontSize:'13px',fontWeight:'500',color:outputType===id?C.accentText:C.text,marginBottom:'1px'}}>{name}</div>
      <div style={{fontSize:'10px',color:C.text3}}>{desc}</div>
    </div>
  ))}
</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flex:1}}>
                      <label style={{fontSize:'13px',color:C.text2,flexShrink:0}}>{howMany}</label>
                      <input type="number" min="1" max="50" value={cardCount} onChange={e=>setCardCount(e.target.value)} className="inp" style={{width:'65px'}}/>
                    </div>
                    {btnPrimary(generate,loading?'Generating...':'Generate',{padding:'12px 20px',fontSize:'14px',opacity:loading?0.6:1,flexShrink:0})}
                  </div>
                </>
              )}
              {createTab==='manual'&&(
                <>
                  <input value={manualSetName} onChange={e=>setManualSetName(e.target.value)} placeholder="Set name" className="inp" style={{marginBottom:'14px',fontSize:'14px'}}/>
                  {manualCards.map((c,i)=>(
                    <div key={i} style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'12px',padding:'14px',marginBottom:'10px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                        <div style={{...labelStyle,color:C.text3}}>Card {i+1}</div>
                        {manualCards.length>1&&<button onClick={()=>removeManualCard(i)} style={{background:'transparent',border:'none',color:C.red,cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}}>Remove</button>}
                      </div>
                      <input value={c.q} onChange={e=>updateManualCard(i,'q',e.target.value)} placeholder="Question or term" className="inp" style={{marginBottom:'8px'}}/>
                      <input value={c.a} onChange={e=>updateManualCard(i,'a',e.target.value)} placeholder="Answer or definition" className="inp"/>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
                    {btn(addManualCard,'+ Add card',{flex:1,textAlign:'center',padding:'12px'})}
                    {btnPrimary(saveManualSet,'Save & study',{flex:1,textAlign:'center',padding:'12px'})}
                  </div>
                </>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {screen==='settings'&&(
            <div className="page-pad" style={{maxWidth:'640px'}}>
              <h1 style={{fontSize:'28px',marginBottom:'4px',...serifStyle}}>Settings</h1>
              <p style={{fontSize:'13px',color:C.text3,marginBottom:'28px'}}>Customize your experience.</p>

              {justSignedIn && (
                <div style={{background:C.accentDim,border:`1px solid ${C.accent}40`,borderRadius:'12px',padding:'14px 18px',marginBottom:'20px',fontSize:'13px',color:C.accentText,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>Welcome! Pick a theme to get started.</span>
                  <button onClick={()=>{setJustSignedIn(false);setScreen('dashboard')}} style={{background:'transparent',border:'none',color:C.accentText,cursor:'pointer',fontSize:'18px',padding:'0 4px'}}>×</button>
                </div>
              )}

              <div style={{marginBottom:'28px'}}>
                <div style={{...labelStyle,color:C.text3,marginBottom:'16px'}}>Theme</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px'}}>
                  {Object.entries(THEMES).map(([key,t])=>(
                    <button key={key} onClick={()=>changeTheme(key)} style={{padding:'0',border:`2px solid ${themeName===key?C.accent:C.border}`,borderRadius:'12px',cursor:'pointer',overflow:'hidden',background:'transparent',fontFamily:'inherit',outline:'none',transition:'border-color .15s'}}>
                      <div style={{background:t.bg,padding:'8px 6px'}}>
                        <div style={{background:t.s1,borderRadius:'4px',padding:'5px',marginBottom:'4px',border:`1px solid ${t.border}`}}>
                          <div style={{height:'3px',background:t.accent,borderRadius:'2px',marginBottom:'2px',width:'60%'}}></div>
                          <div style={{height:'2px',background:t.text3,borderRadius:'2px',width:'80%'}}></div>
                        </div>
                        <div style={{display:'flex',gap:'2px'}}>
                          <div style={{flex:1,height:'2px',background:t.green,borderRadius:'2px'}}></div>
                          <div style={{flex:1,height:'2px',background:t.amber,borderRadius:'2px'}}></div>
                          <div style={{flex:1,height:'2px',background:t.accent,borderRadius:'2px'}}></div>
                        </div>
                      </div>
                      <div style={{padding:'5px 6px',background:t.s1,borderTop:`1px solid ${t.border}`}}>
                        <div style={{fontSize:'10px',fontWeight:'500',color:t.text,textAlign:'center'}}>{t.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:'28px'}}>
                <div style={{...labelStyle,color:C.text3,marginBottom:'16px'}}>Account</div>
                <div style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'20px'}}>
                  {user ? (
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px'}}>
                        {user.imageUrl
                          ? <img src={user.imageUrl} alt="avatar" style={{width:'52px',height:'52px',borderRadius:'50%',objectFit:'cover',border:`2px solid ${C.border2}`}}/>
                          : <div style={{width:'52px',height:'52px',borderRadius:'50%',background:C.accentDim,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:'600',color:C.accent}}>{(user.firstName?.[0]||'?').toUpperCase()}</div>
                        }
                        <div style={{flex:1}}>
                          {editingName ? (
                            <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'4px'}}>
                              <input value={newDisplayName} onChange={e=>setNewDisplayName(e.target.value)} className="inp" style={{fontSize:'14px',padding:'8px 10px'}} placeholder="Display name" autoFocus
                                onKeyDown={e=>{ if(e.key==='Enter'){user.update({firstName:newDisplayName.split(' ')[0],lastName:newDisplayName.split(' ').slice(1).join(' ')});setEditingName(false)} if(e.key==='Escape')setEditingName(false) }}/>
                              <button onClick={()=>{user.update({firstName:newDisplayName.split(' ')[0],lastName:newDisplayName.split(' ').slice(1).join(' ')});setEditingName(false)}} style={{padding:'8px 12px',background:C.accent,border:'none',borderRadius:'6px',color:'white',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>Save</button>
                            </div>
                          ) : (
                            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                              <div style={{fontSize:'16px',fontWeight:'600',color:C.text}}>{user.fullName||user.firstName||'User'}</div>
                              <button onClick={()=>{setEditingName(true);setNewDisplayName(user.fullName||user.firstName||'')}} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:'5px',padding:'3px 8px',color:C.text3,fontSize:'11px',cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
                            </div>
                          )}
                          <div style={{fontSize:'12px',color:C.text3}}>{user.emailAddresses?.[0]?.emailAddress}</div>
                        </div>
                      </div>
                      <SignOutButton signOutCallback={()=>{ setSets([]); setArchivedSets([]); setSetsCreated(0); setStreak(0); setSubjects([]); setScreen('dashboard') }}>
                        <button style={{padding:'10px 18px',background:'transparent',border:`1px solid ${C.red}50`,borderRadius:'8px',color:C.red,fontSize:'14px',cursor:'pointer',fontFamily:'inherit',fontWeight:'500'}}>Sign out</button>
                      </SignOutButton>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:'14px',color:C.text2,marginBottom:'16px'}}>Sign in to save your sets across devices.</div>
                      <SignInButton mode="modal">
                        <button style={{padding:'12px 24px',background:C.accent,border:'none',borderRadius:'8px',color:'white',fontSize:'14px',cursor:'pointer',fontFamily:'inherit',fontWeight:'500'}}>Sign in</button>
                      </SignInButton>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LEARN */}
          {screen==='learn'&&(
            <div className="page-pad" style={{width:'100%'}}>
              {!activeVideo ? (
                <>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'4px'}}>
                    <div style={{flex:1}}>
                      <h1 style={{fontSize:'28px',marginBottom:'4px',...serifStyle,textAlign:selectedSubject?'left':'center'}}>{selectedSubject?selectedSubject.subject:'Recall Map'}</h1>
                      <p style={{fontSize:'13px',color:C.text3,marginBottom:'20px'}}>{selectedSubject?'Videos and resources tailored to what you need to review':''}</p>
                    </div>
                    {selectedSubject&&(
                      <button onClick={()=>{setSelectedSubject(null);setVideos([]);setResources([])}} style={{padding:'8px 14px',background:'transparent',border:`1px solid ${C.border2}`,borderRadius:'8px',color:C.text2,fontSize:'13px',cursor:'pointer',fontFamily:'inherit',marginTop:'4px',flexShrink:0}}>← Back</button>
                    )}
                  </div>

                  {!selectedSubject&&(
                    <>
                      {sets.length===0 ? (
                        <div style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'40px 24px',textAlign:'center'}}>
                          <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'6px'}}>No sets yet</div>
                          <div style={{fontSize:'13px',color:C.text3,marginBottom:'20px'}}>Create some study sets first.</div>
                          {btnPrimary(()=>setScreen('create'),'Create a set')}
                        </div>
                      ) : subjects.length===0 && !loadingSubjects ? (
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh'}}>
                          <div style={{fontSize:'24px',fontWeight:'700',color:C.text,textAlign:'center'}}>Analyzing your sets...</div>
                        </div>
                      ) : (
                        <>
                          <div className="grid-3" style={{marginBottom:'20px'}}>
                            {subjects.map((s,i)=>(
                              <div key={i} style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'16px',cursor:'pointer',transition:'all .15s'}} onClick={()=>loadVideos(s)}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                                  {renamingSubject===i ? (
                                    <input value={subjectRenameValue} onChange={e=>setSubjectRenameValue(e.target.value)}
                                      onKeyDown={e=>{if(e.key==='Enter'){setSubjects(prev=>prev.map((sub,idx)=>idx===i?{...sub,subject:subjectRenameValue}:sub));setRenamingSubject(null)}if(e.key==='Escape')setRenamingSubject(null)}}
                                      onClick={e=>e.stopPropagation()} autoFocus
                                      style={{background:'transparent',border:`1px solid ${C.accent}`,borderRadius:'6px',padding:'4px 8px',color:C.text,fontSize:'14px',outline:'none',fontFamily:'inherit',width:'100%'}}/>
                                  ) : (
                                    <div style={{fontSize:'16px',fontWeight:'600',color:C.text,...serifStyle}}>{s.subject}</div>
                                  )}
                                  <div style={{position:'relative',flexShrink:0,marginLeft:'8px'}} onClick={e=>e.stopPropagation()}>
                                    <button onClick={e=>{e.stopPropagation();setOpenMenu(openMenu===`subj-${i}`?null:`subj-${i}`)}}
                                      style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:'5px',padding:'2px 8px',color:C.text3,fontSize:'13px',cursor:'pointer',fontFamily:'inherit',letterSpacing:'2px',lineHeight:1}}>···</button>
                                    {openMenu===`subj-${i}`&&(
                                      <div style={{position:'absolute',top:'28px',right:0,background:C.s2,border:`1px solid ${C.border2}`,borderRadius:'10px',overflow:'hidden',zIndex:100,minWidth:'130px',boxShadow:'0 8px 24px #00000020'}}>
                                        <div className="dropdown-item" onClick={()=>{setRenamingSubject(i);setSubjectRenameValue(s.subject);setOpenMenu(null)}}>Rename</div>
                                        <div className="dropdown-item" onClick={()=>{setArchivedSubjects(prev=>[...prev,subjects[i]]);setSubjects(prev=>prev.filter((_,idx)=>idx!==i));setOpenMenu(null)}} style={{color:C.amber}}>Archive</div>
                                        <div className="dropdown-item" onClick={()=>{setSubjects(prev=>prev.filter((_,idx)=>idx!==i));setOpenMenu(null)}} style={{color:C.red}}>Delete</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div style={{marginBottom:'10px'}}>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                                    <span style={{fontSize:'11px',color:C.text3}}>Recall</span>
                                    <span style={{fontSize:'12px',fontWeight:'700',color:knowledgeColor(s.knowledgePercent)}}>{s.knowledgePercent}%</span>
                                  </div>
                                  <div style={{height:'6px',background:C.s3,borderRadius:'4px'}}>
                                    <div style={{height:'100%',width:`${s.knowledgePercent}%`,background:knowledgeColor(s.knowledgePercent),borderRadius:'4px',transition:'width .6s ease'}}></div>
                                  </div>
                                </div>
                                {s.analysis&&<div style={{fontSize:'12px',color:C.text2,marginBottom:'8px',lineHeight:'1.5'}}>{s.analysis}</div>}
                                {s.weakAreas?.length>0&&<div style={{marginBottom:'3px'}}><span style={{fontSize:'10px',color:'#ef4444',fontWeight:'600'}}>Needs work: </span><span style={{fontSize:'10px',color:C.text3}}>{s.weakAreas.slice(0,3).join(', ')}</span></div>}
                                {s.strongAreas?.length>0&&<div style={{marginBottom:'8px'}}><span style={{fontSize:'10px',color:'#22c55e',fontWeight:'600'}}>Strong: </span><span style={{fontSize:'10px',color:C.text3}}>{s.strongAreas.slice(0,2).join(', ')}</span></div>}
                                <div style={{fontSize:'12px',color:C.accent,fontWeight:'500'}}>Explore resources →</div>
                              </div>
                            ))}
                          </div>
                          {loadingSubjects&&<div style={{fontSize:'13px',color:C.text3,marginBottom:'12px'}}>Updating recall map...</div>}
                          <button onClick={()=>detectSubjects(sets)} disabled={loadingSubjects} style={{background:'transparent',border:`1px solid ${C.border2}`,borderRadius:'8px',padding:'10px 16px',color:C.text3,fontSize:'13px',cursor:'pointer',fontFamily:'inherit',opacity:loadingSubjects?0.6:1,width:'100%'}}>
                            {loadingSubjects?'Re-analyzing...':'Re-analyze subjects'}
                          </button>
                          {archivedSubjects.length>0&&(
                            <div style={{marginTop:'20px'}}>
                              <div onClick={()=>setShowArchivedSubjects(a=>!a)} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px',cursor:'pointer',userSelect:'none'}}>
                                <div style={{...serifStyle,fontSize:'13px',color:C.text3}}>Archived subjects — {archivedSubjects.length}</div>
                                <div style={{fontSize:'11px',color:C.text3}}>{showArchivedSubjects?'▲':'▼'}</div>
                              </div>
                              {showArchivedSubjects&&(
                                <div className="grid-1">
                                  {archivedSubjects.map((s,i)=>(
                                    <div key={i} style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'16px',opacity:0.6}}>
                                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                        <div style={{fontSize:'15px',fontWeight:'600',color:C.text,...serifStyle}}>{s.subject}</div>
                                        <button onClick={()=>{setSubjects(prev=>[...prev,s]);setArchivedSubjects(prev=>prev.filter((_,idx)=>idx!==i))}} style={{background:'transparent',border:`1px solid ${C.border2}`,borderRadius:'6px',padding:'4px 10px',color:C.text2,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>Restore</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {selectedSubject&&(
                    <>
                      <div style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'14px',padding:'16px',marginBottom:'16px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:'13px',fontWeight:'600',color:C.text,marginBottom:'4px'}}>Recall breakdown</div>
                            <div style={{fontSize:'12px',color:C.text3,lineHeight:'1.5'}}>{selectedSubject.analysis}</div>
                          </div>
                          <div style={{fontSize:'20px',fontWeight:'700',color:knowledgeColor(subjects.find(s=>s.subject===selectedSubject.subject)?.knowledgePercent||selectedSubject.knowledgePercent),flexShrink:0,marginLeft:'12px'}}>
                            {subjects.find(s=>s.subject===selectedSubject.subject)?.knowledgePercent||selectedSubject.knowledgePercent}%
                          </div>
                        </div>
                        <div style={{height:'8px',background:C.s3,borderRadius:'4px',marginBottom:'12px'}}>
                          <div style={{height:'100%',width:`${subjects.find(s=>s.subject===selectedSubject.subject)?.knowledgePercent||selectedSubject.knowledgePercent}%`,background:knowledgeColor(selectedSubject.knowledgePercent),borderRadius:'4px',transition:'width .6s ease'}}></div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                          {selectedSubject.weakAreas?.length>0&&(
                            <div style={{background:C.redDim,border:`1px solid ${C.red}20`,borderRadius:'10px',padding:'10px'}}>
                              <div style={{fontSize:'10px',color:'#ef4444',fontWeight:'600',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.06em'}}>Needs work</div>
                              {selectedSubject.weakAreas.map((w,i)=>(<div key={i} style={{fontSize:'11px',color:C.text2,marginBottom:'2px'}}>· {w}</div>))}
                            </div>
                          )}
                          {selectedSubject.strongAreas?.length>0&&(
                            <div style={{background:C.greenDim,border:'1px solid #22c55e20',borderRadius:'10px',padding:'10px'}}>
                              <div style={{fontSize:'10px',color:'#22c55e',fontWeight:'600',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.06em'}}>Strong</div>
                              {selectedSubject.strongAreas.map((w,i)=>(<div key={i} style={{fontSize:'11px',color:C.text2,marginBottom:'2px'}}>· {w}</div>))}
                            </div>
                          )}
                        </div>
                      </div>

                      {resources.length>0&&(
                        <div style={{marginBottom:'20px'}}>
                          <div style={{...serifStyle,fontSize:'14px',color:C.text,marginBottom:'10px'}}>Resources</div>
                          <div className="grid-1">
                            {resources.map((r,i)=>(
                              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'12px',padding:'12px',textDecoration:'none',display:'block'}}>
                                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'4px'}}>
                                  <div style={{fontSize:'13px',fontWeight:'500',color:C.text,lineHeight:'1.3'}}>{r.title}</div>
                                  <div style={{fontSize:'10px',fontWeight:'600',color:C.accent,background:C.accentDim,padding:'2px 8px',borderRadius:'20px',flexShrink:0,marginLeft:'8px'}}>{r.source}</div>
                                </div>
                                <div style={{fontSize:'11px',color:C.text3,lineHeight:'1.4'}}>{r.description}</div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{...serifStyle,fontSize:'14px',color:C.text,marginBottom:'10px'}}>
                        {selectedSubject.weakAreas?.length>0 ? `Videos: ${selectedSubject.weakAreas.slice(0,2).join(', ')}` : 'Recommended videos'}
                      </div>
                      {loadingVideos ? (
                        <div style={{textAlign:'center',padding:'40px',color:C.text3}}>Finding videos...</div>
                      ) : (
                        <div className="grid-1">
                          {videos.map((v,i)=>(
                            <div key={i} onClick={()=>{navigate('learn');openVideo(v)}} style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'14px',overflow:'hidden',cursor:'pointer',display:'flex',gap:'12px',padding:'12px'}}>
                              <div style={{width:'100px',height:'64px',flexShrink:0,borderRadius:'8px',overflow:'hidden'}}>
                                <img src={v.thumbnail} alt={v.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:'13px',fontWeight:'500',color:C.text,lineHeight:'1.4',marginBottom:'4px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{v.title}</div>
                                <div style={{fontSize:'11px',color:C.text3}}>{v.channel}</div>
                                {v.durationLabel&&<div style={{fontSize:'11px',color:C.text3}}>{v.durationLabel}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div style={{width:'100%'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
                    <button onClick={goBack} style={{padding:'8px 14px',background:'transparent',border:`1px solid ${C.border2}`,borderRadius:'8px',color:C.text2,fontSize:'13px',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>← Back</button>
                    <span style={{fontSize:'13px',fontWeight:'500',color:C.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{activeVideo.title}</span>
                    {videoScore!==null&&<span style={{fontSize:'13px',fontWeight:'600',color:knowledgeColor(videoScore),flexShrink:0}}>Score: {videoScore}%</span>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                    <div style={{borderRadius:'12px',overflow:'hidden',border:`2px solid ${C.border}`,background:'#000'}}>
                      <div style={{position:'relative',paddingBottom:'56.25%',height:0}}>
                        <iframe
                          key={`${activeVideo.id}-${videoProgressRef.current[activeVideo.id]||0}`}
                          ref={playerRef}
                          src={`https://www.youtube.com/embed/${activeVideo.id}?enablejsapi=1&autoplay=1&start=${videoProgressRef.current[activeVideo.id]||0}`}
                          title={activeVideo.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none'}}
                        />
                      </div>
                    </div>
                    {currentQuestion&&(
                      <div style={{background:C.s1,border:`2px solid ${C.accent}`,borderRadius:'14px',padding:'18px'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                          <div style={{fontSize:'10px',color:C.accent,fontWeight:'600',textTransform:'uppercase',letterSpacing:'.08em'}}>Knowledge check</div>
                          <div style={{fontSize:'11px',color:C.text3}}>Q {videoQuestions.indexOf(currentQuestion)+1}/{videoQuestions.length}</div>
                        </div>
                        <div style={{fontSize:'16px',fontWeight:'500',marginBottom:'16px',lineHeight:'1.5',...serifStyle,color:C.text}}><MathText text={currentQuestion.q}/></div>
                        {questionAnswered ? (
                          <div>
                            <div style={{padding:'12px',borderRadius:'10px',background:questionAnswered==='correct'?'#22c55e18':'#ef444418',border:`1px solid ${questionAnswered==='correct'?'#22c55e40':'#ef444440'}`,marginBottom:'12px'}}>
                              <div style={{fontSize:'14px',fontWeight:'600',color:questionAnswered==='correct'?'#22c55e':'#ef4444',marginBottom:'4px'}}>{questionAnswered==='correct'?'Correct!':'Incorrect'}</div>
                              {currentQuestion.explanation&&<div style={{fontSize:'12px',color:C.text2,lineHeight:'1.5'}}>{currentQuestion.explanation}</div>}
                            </div>
                            <button onClick={()=>{setCurrentQuestion(null);setQuestionAnswered(null);playVideo()}} style={{width:'100%',padding:'12px',background:C.accent,border:'none',borderRadius:'8px',color:'white',fontSize:'15px',cursor:'pointer',fontFamily:'inherit',fontWeight:'500'}}>Resume ▶</button>
                          </div>
                        ) : (
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                            {currentQuestion.options.map((opt,i)=>(
                              <button key={i} onClick={()=>answerVideoQuestion(opt)} style={{padding:'12px 10px',background:C.s2,border:`1px solid ${C.border2}`,borderRadius:'10px',color:C.text,fontSize:'13px',cursor:'pointer',fontFamily:'inherit',textAlign:'left',lineHeight:'1.4'}}>
                                <span style={{color:C.text3,marginRight:'6px',fontWeight:'600'}}>{['A','B','C','D'][i]}.</span><MathText text={opt}/>
                              </button>
                            ))}
                          </div>
                        )}
                        <div style={{marginTop:'12px',height:'3px',background:C.s3,borderRadius:'2px'}}>
                          <div style={{height:'100%',width:`${((videoQuestions.indexOf(currentQuestion)+1)/videoQuestions.length)*100}%`,background:C.accent,borderRadius:'2px',transition:'width .3s'}}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STUDY */}
          {screen==='study'&&(
            <div className="page-pad">
              {!activeCards ? (
                <div style={{textAlign:'center',padding:'60px 20px',color:C.text3}}>
                  <div style={{fontSize:'15px',marginBottom:'16px'}}>No set selected</div>
                  {btnPrimary(()=>setScreen('dashboard'),'Go to dashboard')}
                </div>
              ) : (
                <div style={{maxWidth:currentType==='quiz'?'860px':'680px',width:'100%',margin:'0 auto'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
                    {btn(()=>{goBack();restart()},'← Back',{padding:'8px 14px',fontSize:'13px'})}
                    <span style={{fontSize:'13px',fontWeight:'500',color:C.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{currentSetName}</span>
                    <span style={{fontSize:'12px',color:C.text3,flexShrink:0}}>{currentType==='quiz'?`${Object.keys(quizAnswers).length}/${(activeCards||[]).length}`:`${cardIndex+1}/${sessionCards.length}`}</span>
                  </div>
                  <div style={{height:'2px',background:C.s3,borderRadius:'2px',marginBottom:'20px'}}>
                    <div style={{height:'100%',background:C.accent,borderRadius:'2px',transition:'width .4s ease',width:currentType==='quiz'?`${(Object.keys(quizAnswers).length/(activeCards||[]).length)*100}%`:`${progress}%`}}></div>
                  </div>

                  {currentType==='flashcards'&&!done&&card&&(
                    <>
                      <div className="card-scene" onClick={()=>setFlipped(f=>!f)}>
                        <div className={`card-flipper ${flipped?'flipped':''}`}>
                          <div className="card-face card-front">
                            <div style={{...labelStyle,color:C.text3,marginBottom:'16px'}}>Question</div>
                            <div style={{fontSize:'20px',lineHeight:'1.5',...serifStyle,color:C.text}}><MathText text={card.q}/></div>
                          </div>
                          <div className="card-face card-back">
                            <div style={{...labelStyle,color:C.accent,marginBottom:'16px'}}>Answer</div>
                            <div style={{fontSize:'16px',color:C.text2,lineHeight:'1.7'}}><MathText text={card.a}/></div>
                          </div>
                        </div>
                      </div>
                      <button onClick={()=>startEditCard(cardIndex)} style={{padding:'6px 12px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:'6px',color:C.text3,fontSize:'12px',cursor:'pointer',fontFamily:'inherit',marginBottom:'12px'}}>Edit card</button>
                      {flipped ? (
                        <div style={{display:'flex',gap:'6px'}}>
                          {[{label:'Blackout',q:0,bg:'#ef444418',border:'#ef444440',color:'#ef4444'},{label:'Hard',q:2,bg:'#f59e0b18',border:'#f59e0b40',color:'#f59e0b'},{label:'Good',q:4,bg:'#22c55e18',border:'#22c55e40',color:'#22c55e'},{label:'Easy',q:5,bg:'#3b82f618',border:'#3b82f640',color:'#3b82f6'}].map(r=>(
                            <button key={r.label} className="sm2-btn" onClick={()=>answerCard(r.q)} style={{background:r.bg,border:`1px solid ${r.border}`,color:r.color}}>{r.label}</button>
                          ))}
                        </div>
                      ) : (
                        <div style={{textAlign:'center',color:C.text3,fontSize:'14px',padding:'14px',background:C.s1,borderRadius:'10px',border:`1px solid ${C.border}`}}>Tap card to flip</div>
                      )}
                    </>
                  )}

                  {currentType==='quiz'&&!quizSubmitted&&(
                    <div>
                      {(activeCards||[]).map((c,i)=>(
                        <div key={i} style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                            <div style={{...labelStyle,color:C.text3}}>Question {i+1}</div>
                            <button onClick={()=>{setEditingCard(i);setEditQ(c.q);setEditA(c.a)}} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:'5px',padding:'4px 10px',color:C.text3,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
                          </div>
                          <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'14px',lineHeight:'1.5',...serifStyle}}><MathText text={c.q}/></div>
                          {(c.options||[c.a]).map((opt,j)=>(
                            <button key={j} className={`opt-btn ${quizAnswers[i]===opt?'selected':''}`} onClick={()=>setQuizAnswers(a=>({...a,[i]:opt}))}>
                              <span style={{color:C.text3,marginRight:'10px',fontSize:'13px'}}>{['A','B','C','D'][j]}.</span><MathText text={opt}/>
                            </button>
                          ))}
                        </div>
                      ))}
                      {btnPrimary(submitQuiz,'Submit',{width:'100%',padding:'14px',fontSize:'15px',opacity:Object.keys(quizAnswers).length<(activeCards||[]).length?0.4:1})}
                    </div>
                  )}

                  {currentType==='sheet'&&!done&&(
                    <div>
                      {(activeCards||[]).map((c,i)=>(
                        <div key={i} style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'14px',padding:'18px',marginBottom:'10px',borderLeft:`3px solid ${C.green}`}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                            <div style={{fontSize:'15px',fontWeight:'500',color:C.text,...serifStyle}}><MathText text={c.q}/></div>
                            <button onClick={()=>{setEditingCard(i);setEditQ(c.q);setEditA(c.a)}} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:'5px',padding:'4px 10px',color:C.text3,fontSize:'12px',cursor:'pointer',fontFamily:'inherit',flexShrink:0,marginLeft:'10px'}}>Edit</button>
                          </div>
                          <div style={{fontSize:'14px',color:C.text2,lineHeight:'1.8'}}><MathText text={c.a}/></div>
                        </div>
                      ))}
                      {btnPrimary(()=>finishStudy(100,activeCards),'Mark as studied',{width:'100%',padding:'13px',marginTop:'8px'})}
                    </div>
                  )}

                  {currentType==='quiz'&&quizSubmitted&&(
                    <div style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'32px 20px',textAlign:'center'}}>
                      <div style={{fontSize:'26px',marginBottom:'6px',...serifStyle}}>Quiz complete</div>
                      <div style={{fontSize:'15px',color:C.text2,marginBottom:'24px'}}><span style={{color:'#22c55e',fontWeight:'600'}}>{quizScore}</span> of <span style={{fontWeight:'600'}}>{(activeCards||[]).length}</span> correct</div>
                      <div style={{marginBottom:'24px',textAlign:'left'}}>
                        {(activeCards||[]).map((c,i)=>(
                          <div key={i} style={{background:quizAnswers[i]===c.a?'#22c55e12':'#ef444412',border:`1px solid ${quizAnswers[i]===c.a?'#22c55e30':'#ef444430'}`,borderRadius:'10px',padding:'12px 14px',marginBottom:'8px'}}>
                            <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'4px'}}><MathText text={c.q}/></div>
                            <div style={{fontSize:'13px',color:quizAnswers[i]===c.a?'#22c55e':'#ef4444'}}>{quizAnswers[i]===c.a?'Correct':`You: ${quizAnswers[i]}`}</div>
                            {quizAnswers[i]!==c.a&&<div style={{fontSize:'13px',color:'#22c55e',marginTop:'2px'}}>Correct: <MathText text={c.a}/></div>}
                          </div>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
                        {btnPrimary(restart,'Retake')}
                        {btn(()=>{setScreen('dashboard');restart()},'Dashboard')}
                      </div>
                    </div>
                  )}

                  {currentType==='flashcards'&&done&&(
                    <div style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'32px 20px',textAlign:'center'}}>
                      <div style={{fontSize:'26px',marginBottom:'6px',...serifStyle}}>Session complete</div>
                      <div style={{fontSize:'13px',color:C.text3,marginBottom:'24px'}}>{got} recalled · {learning} to review</div>
                      <div style={{display:'flex',gap:'10px',justifyContent:'center',marginBottom:'20px'}}>
                        <div style={{background:'#22c55e12',border:'1px solid #22c55e30',borderRadius:'12px',padding:'14px 28px'}}>
                          <div style={{fontSize:'26px',...serifStyle,color:'#22c55e'}}>{got}</div>
                          <div style={{...labelStyle,color:C.text3,marginTop:'4px'}}>Recalled</div>
                        </div>
                        <div style={{background:'#ef444412',border:'1px solid #ef444430',borderRadius:'12px',padding:'14px 28px'}}>
                          <div style={{fontSize:'26px',...serifStyle,color:'#ef4444'}}>{learning}</div>
                          <div style={{...labelStyle,color:C.text3,marginTop:'4px'}}>Review</div>
                        </div>
                      </div>
                      {weakCardsCount>0&&(
                        <div style={{background:'#f59e0b12',border:'1px solid #f59e0b30',borderRadius:'10px',padding:'14px 16px',marginBottom:'16px',textAlign:'left'}}>
                          <div style={{fontSize:'13px',fontWeight:'500',color:'#f59e0b',marginBottom:'4px'}}>{weakCardsCount} concept{weakCardsCount>1?'s':''} to strengthen</div>
                          <div style={{fontSize:'12px',color:C.text3,marginBottom:'10px'}}>Generate new questions on the same topics you struggled with.</div>
                          <button onClick={studyWeakCards} disabled={generatingReview} style={{width:'100%',padding:'10px',background:'#f59e0b',color:'#000',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer',opacity:generatingReview?0.6:1,fontFamily:'inherit'}}>
                            {generatingReview?'Generating...':'Practice weak concepts'}
                          </button>
                        </div>
                      )}
                      <div style={{fontSize:'11px',color:C.text3,marginBottom:'16px'}}>SM-2 has scheduled your next reviews.</div>
                      {btn(()=>{setScreen('dashboard');restart()},'Back to dashboard',{padding:'11px 24px'})}
                    </div>
                  )}

                  {currentType==='sheet'&&done&&(
                    <div style={{background:C.s1,border:`2px solid ${C.border}`,borderRadius:'16px',padding:'32px 20px',textAlign:'center'}}>
                      <div style={{fontSize:'26px',marginBottom:'6px',...serifStyle}}>Sheet reviewed</div>
                      <div style={{fontSize:'13px',color:C.text3,marginBottom:'20px'}}>All {(activeCards||[]).length} concepts reviewed</div>
                      <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
                        {btnPrimary(()=>setDone(false),'Review again')}
                        {btn(()=>{setScreen('dashboard');restart()},'Dashboard')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="bottom-nav">
        {[
  {id:'dashboard',label:'Home'},
  {id:'create',label:'Create'},
  {id:'study',label:'Study'},
  {id:'learn',label:'✨ Recall Map'},
  {id:'settings',label:'Settings'},
].map(({id,label})=>(
  <div key={id} className="bnav-item"
    onClick={()=>navTo(id)}
    style={{color:screen===id?C.accent:C.text3, background:screen===id?C.accentDim:'transparent'}}>
    <span style={{fontSize:id==='learn'?'13px':'11px',fontWeight:id==='learn'?'700':'500',lineHeight:1.3,textAlign:'center'}}>{label}</span>
  </div>
))}
      </div>

    </div>
  )
}
