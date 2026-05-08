import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

const emptyForm = {
  title: '',
  actioned: false,
  was_correct: false,
  date: new Date().toISOString().split('T')[0]
}

function VideoReviews() {
  const [reviews, setReviews] = useState([])
  const [showing, setShowing] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [expandedChart, setExpandedChart] = useState(null)
  const [addingComment, setAddingComment] = useState({})
  const [commentText, setCommentText] = useState({})
  const [commentFile, setCommentFile] = useState({})
  const [commentPreview, setCommentPreview] = useState({})
  const [uploadingComment, setUploadingComment] = useState({})
  const pasteRefs = useRef({})

  useEffect(() => { fetchReviews() }, [])

  const fetchReviews = async () => {
    const { data } = await supabase.from('video_reviews').select('*').order('created_at', { ascending: false })
    if (data) setReviews(data)
  }

  const saveReview = async () => {
    if (!form.title) return
    await supabase.from('video_reviews').insert([{
      title: form.title,
      actioned: form.actioned,
      was_correct: form.was_correct,
      date: form.date,
      comments: []
    }])
    setForm(emptyForm)
    setShowing(false)
    fetchReviews()
  }

  const saveEdit = async (id) => {
    await supabase.from('video_reviews').update({
      title: editForm.title,
      actioned: editForm.actioned,
      was_correct: editForm.was_correct,
    }).eq('id', id)
    setEditingId(null)
    fetchReviews()
  }

  const toggleField = async (review, field) => {
    await supabase.from('video_reviews').update({ [field]: !review[field] }).eq('id', review.id)
    fetchReviews()
  }

  const deleteReview = async (id) => {
    await supabase.from('video_reviews').delete().eq('id', id)
    setReviews(reviews.filter(r => r.id !== id))
  }

  const handleCommentPaste = (e, reviewId) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image')) {
        const file = items[i].getAsFile()
        setCommentFile(prev => ({ ...prev, [reviewId]: file }))
        setCommentPreview(prev => ({ ...prev, [reviewId]: URL.createObjectURL(file) }))
        break
      }
    }
  }

  const handleCommentFile = (e, reviewId) => {
    const file = e.target.files[0]
    if (!file) return
    setCommentFile(prev => ({ ...prev, [reviewId]: file }))
    setCommentPreview(prev => ({ ...prev, [reviewId]: URL.createObjectURL(file) }))
  }

  const saveComment = async (review) => {
    const text = commentText[review.id] || ''
    const file = commentFile[review.id]
    if (!text && !file) return
    setUploadingComment(prev => ({ ...prev, [review.id]: true }))
    let chart_url = null
    if (file) {
      const fileName = Date.now() + '_vr_comment.png'
      const { error } = await supabase.storage.from('charts').upload(fileName, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from('charts').getPublicUrl(fileName)
        chart_url = urlData.publicUrl
      }
    }
    const existing = review.comments || []
    const newComments = [...existing, {
      text,
      chart_url,
      created_at: new Date().toISOString()
    }]
    await supabase.from('video_reviews').update({ comments: newComments }).eq('id', review.id)
    setCommentText(prev => ({ ...prev, [review.id]: '' }))
    setCommentFile(prev => ({ ...prev, [review.id]: null }))
    setCommentPreview(prev => ({ ...prev, [review.id]: null }))
    setAddingComment(prev => ({ ...prev, [review.id]: false }))
    setUploadingComment(prev => ({ ...prev, [review.id]: false }))
    fetchReviews()
  }

  const deleteComment = async (review, index) => {
    const newComments = (review.comments || []).filter((_, i) => i !== index)
    await supabase.from('video_reviews').update({ comments: newComments }).eq('id', review.id)
    fetchReviews()
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  const CheckToggle = ({ checked, onChange, label: lbl, activeColor }) => (
    <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: checked ? (activeColor === 'green' ? '#D4EAD8' : '#F5E6C8') : '#F5EFE4', borderRadius: '8px', border: checked ? ('1px solid ' + (activeColor === 'green' ? '#5DA070' : '#C8903A')) : '1px solid #C8B89A', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: checked ? ('1.5px solid ' + (activeColor === 'green' ? '#3D7A52' : '#C8903A')) : '1.5px solid #C8B89A', background: checked ? (activeColor === 'green' ? '#3D7A52' : '#C8903A') : '#F5EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {checked && <span style={{ color: 'white', fontSize: '11px', fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: checked ? (activeColor === 'green' ? '#2A5E38' : '#7A4F1A') : '#9C856A' }}>{lbl}</span>
    </div>
  )

  const actioned = reviews.filter(r => r.actioned).length
  const correct = reviews.filter(r => r.was_correct).length

  return (
    <div>
      {expandedChart && (
        <div onClick={() => setExpandedChart(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <img src={expandedChart} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }} />
        </div>
      )}

      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Video Reviews</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{reviews.length} reviews · {actioned} actioned · {correct} correct</div>
        </div>
        <button onClick={() => setShowing(!showing)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Add Review</button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {reviews.length >= 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { label: 'Total Reviews', value: reviews.length, sub: 'logged', color: '#2B2318' },
              { label: 'Actioned', value: actioned, sub: `${Math.round((actioned / reviews.length) * 100)}% of reviews`, color: '#C8903A' },
              { label: 'Was Correct', value: correct, sub: `${Math.round((correct / reviews.length) * 100)}% of reviews`, color: '#3D7A52' },
            ].map(s => (
              <div key={s.label} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '16px' }}>New Review</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={label}>Title of the video</label>
                <input type="text" placeholder="e.g. BTC Weekly Analysis — May 8th" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={input} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <CheckToggle checked={form.actioned} onChange={() => setForm({ ...form, actioned: !form.actioned })} label="Did I action it?" activeColor="amber" />
              <CheckToggle checked={form.was_correct} onChange={() => setForm({ ...form, was_correct: !form.was_correct })} label="Was it correct?" activeColor="green" />
            </div>
            <div style={{ fontSize: '11px', color: '#9C856A', marginBottom: '16px' }}>You can add comments and screenshots after saving.</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveReview} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save Review</button>
              <button onClick={() => { setShowing(false); setForm(emptyForm) }} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {reviews.length === 0 && !showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '24px', fontSize: '13px', color: '#9C856A' }}>No reviews yet. Hit Add Review to log accountability notes on videos you watch.</div>
        )}

        {reviews.map((r) => {
          const isExpanded = expanded === r.id
          const isEditing = editingId === r.id
          const comments = r.comments || []
          const isAddingComment = addingComment[r.id] || false
          const fileInputRef = { current: null }

          return (
            <div key={r.id} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
              <div onClick={() => { if (!isEditing) setExpanded(isExpanded ? null : r.id) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{r.title}</div>
                  <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>{r.date} · {comments.length} comment{comments.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {r.actioned && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: '#F5E6C8', color: '#7A4F1A', border: '1px solid #C8903A' }}>Actioned</span>}
                  {r.was_correct && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: '#D4EAD8', color: '#2A5E38', border: '1px solid #5DA070' }}>Correct</span>}
                  {!r.actioned && !r.was_correct && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: '#F5EFE4', color: '#9C856A', border: '1px solid #C8B89A' }}>Pending</span>}
                </div>
                <span style={{ fontSize: '14px', color: '#9C856A' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && !isEditing && (
                <div style={{ borderTop: '1px solid #C8B89A', padding: '16px 18px', background: '#F5EFE4', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div onClick={() => toggleField(r, 'actioned')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: r.actioned ? '#F5E6C8' : '#EDE4D3', borderRadius: '8px', border: r.actioned ? '1px solid #C8903A' : '1px solid #C8B89A', cursor: 'pointer' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: r.actioned ? '1.5px solid #C8903A' : '1.5px solid #C8B89A', background: r.actioned ? '#C8903A' : '#F5EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {r.actioned && <span style={{ color: 'white', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: r.actioned ? '#7A4F1A' : '#9C856A' }}>Did I action it?</span>
                    </div>
                    <div onClick={() => toggleField(r, 'was_correct')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: r.was_correct ? '#D4EAD8' : '#EDE4D3', borderRadius: '8px', border: r.was_correct ? '1px solid #5DA070' : '1px solid #C8B89A', cursor: 'pointer' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: r.was_correct ? '1.5px solid #3D7A52' : '1.5px solid #C8B89A', background: r.was_correct ? '#3D7A52' : '#F5EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {r.was_correct && <span style={{ color: 'white', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: r.was_correct ? '#2A5E38' : '#9C856A' }}>Was it correct?</span>
                    </div>
                  </div>

                  {comments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Comments</div>
                      {comments.map((c, ci) => (
                        <div key={ci} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: c.chart_url ? '10px' : '0' }}>
                            <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#C8903A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white', flexShrink: 0, marginTop: '1px' }}>{ci + 1}</div>
                              <div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.7, whiteSpace: 'pre-wrap', flex: 1 }}>{c.text}</div>
                            </div>
                            <button onClick={() => deleteComment(r, ci)} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '14px', padding: '0', flexShrink: 0 }}>✕</button>
                          </div>
                          {c.chart_url && (
                            <img onClick={() => setExpandedChart(c.chart_url)} src={c.chart_url} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #C8B89A', cursor: 'pointer', marginTop: '8px', marginLeft: '30px' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isAddingComment && (
                    <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Comment {comments.length + 1}</div>
                      <div style={{ marginBottom: '10px' }}>
                        <textarea
                          placeholder="Write your comment here..."
                          value={commentText[r.id] || ''}
                          onChange={e => setCommentText(prev => ({ ...prev, [r.id]: e.target.value }))}
                          style={{ ...input, height: '80px', resize: 'vertical' }}
                          autoFocus
                        />
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <div
                          ref={el => pasteRefs.current[r.id] = el}
                          onPaste={e => handleCommentPaste(e, r.id)}
                          tabIndex={0}
                          style={{ border: '2px dashed #C8B89A', borderRadius: '8px', padding: '12px', textAlign: 'center', background: '#F5EFE4', outline: 'none' }}
                        >
                          {commentPreview[r.id] ? (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <img src={commentPreview[r.id]} style={{ maxHeight: '120px', borderRadius: '6px', objectFit: 'contain' }} />
                              <button onClick={() => { setCommentFile(prev => ({ ...prev, [r.id]: null })); setCommentPreview(prev => ({ ...prev, [r.id]: null })) }} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#9B3A28', border: 'none', borderRadius: '50%', width: '18px', height: '18px', color: 'white', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <label style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', color: '#5A4535', cursor: 'pointer', fontWeight: 600 }}>
                                Browse file
                                <input type="file" accept="image/*" onChange={e => handleCommentFile(e, r.id)} style={{ display: 'none' }} />
                              </label>
                              <button type="button" onClick={() => pasteRefs.current[r.id]?.focus()} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', color: '#5A4535', cursor: 'pointer', fontWeight: 600 }}>Click then Cmd+V to paste</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => saveComment(r)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>{uploadingComment[r.id] ? 'Saving...' : 'Save Comment'}</button>
                        <button onClick={() => { setAddingComment(prev => ({ ...prev, [r.id]: false })); setCommentText(prev => ({ ...prev, [r.id]: '' })); setCommentFile(prev => ({ ...prev, [r.id]: null })); setCommentPreview(prev => ({ ...prev, [r.id]: null })) }} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {!isAddingComment && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setAddingComment(prev => ({ ...prev, [r.id]: true }))} style={{ background: 'transparent', border: '1px solid #C8903A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#C8903A', cursor: 'pointer' }}>+ Add Comment</button>
                      <button onClick={() => { setEditingId(r.id); setEditForm({ title: r.title, actioned: r.actioned, was_correct: r.was_correct }) }} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#5A4535', cursor: 'pointer' }}>✏️ Edit Title</button>
                      <button onClick={() => deleteReview(r.id)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Delete</button>
                    </div>
                  )}
                </div>
              )}

              {isEditing && (
                <div style={{ borderTop: '1px solid #C8B89A', padding: '16px 18px', background: '#F5EFE4', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={label}>Title</label>
                    <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} style={input} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <CheckToggle checked={editForm.actioned} onChange={() => setEditForm({ ...editForm, actioned: !editForm.actioned })} label="Did I action it?" activeColor="amber" />
                    <CheckToggle checked={editForm.was_correct} onChange={() => setEditForm({ ...editForm, was_correct: !editForm.was_correct })} label="Was it correct?" activeColor="green" />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => saveEdit(r.id)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default VideoReviews