import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function Education() {
  const [authors, setAuthors] = useState([])
  const [articles, setArticles] = useState([])
  const [selectedAuthor, setSelectedAuthor] = useState(null)
  const [showAddAuthor, setShowAddAuthor] = useState(false)
  const [showAddArticle, setShowAddArticle] = useState(false)
  const [expandedArticle, setExpandedArticle] = useState(null)
  const [authorForm, setAuthorForm] = useState({ name: '', description: '' })
  const [articleForm, setArticleForm] = useState({ title: '', url: '', content: '', notes: '', tags: '', date_read: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchAuthors() }, [])
  useEffect(() => { if (selectedAuthor) fetchArticles(selectedAuthor.id) }, [selectedAuthor])

  const fetchAuthors = async () => {
    const { data } = await supabase.from('education_authors').select('*').order('created_at')
    if (data) setAuthors(data)
  }

  const fetchArticles = async (authorId) => {
    const { data } = await supabase.from('education_articles').select('*').eq('author_id', authorId).order('created_at', { ascending: false })
    if (data) setArticles(data)
  }

  const saveAuthor = async () => {
    if (!authorForm.name) return
    const colors = ['#C8903A', '#3D7A52', '#5A90CA', '#9B3A28', '#7A4F9A', '#C87055']
    const avatar_color = colors[authors.length % colors.length]
    const { data } = await supabase.from('education_authors').insert([{ name: authorForm.name, description: authorForm.description, avatar_color }]).select()
    if (data) {
      setAuthorForm({ name: '', description: '' })
      setShowAddAuthor(false)
      await fetchAuthors()
      setSelectedAuthor(data[0])
    }
  }

  const saveArticle = async () => {
    if (!articleForm.title || !selectedAuthor) return
    await supabase.from('education_articles').insert([{
      author_id: selectedAuthor.id,
      title: articleForm.title,
      url: articleForm.url,
      notes: articleForm.content || articleForm.notes,
      tags: articleForm.tags ? articleForm.tags.split(',').map(t => t.trim()) : [],
      date_read: articleForm.date_read
    }])
    setArticleForm({ title: '', url: '', content: '', notes: '', tags: '', date_read: new Date().toISOString().split('T')[0] })
    setShowAddArticle(false)
    fetchArticles(selectedAuthor.id)
  }

  const deleteAuthor = async (id) => {
    await supabase.from('education_authors').delete().eq('id', id)
    if (selectedAuthor?.id === id) { setSelectedAuthor(null); setArticles([]) }
    fetchAuthors()
  }

  const deleteArticle = async (id) => {
    await supabase.from('education_articles').delete().eq('id', id)
    fetchArticles(selectedAuthor.id)
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Education</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{authors.length} sources · {articles.length} articles loaded</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', flex: 1, overflow: 'hidden' }}>

        <div style={{ borderRight: '1px solid #C8B89A', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#EDE4D3' }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #C8B89A' }}>
            <button onClick={() => setShowAddAuthor(!showAddAuthor)} style={{ width: '100%', background: '#C8903A', border: 'none', borderRadius: '8px', padding: '7px', fontSize: '12px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Add Person</button>
          </div>

          {showAddAuthor && (
            <div style={{ padding: '10px', borderBottom: '1px solid #C8B89A', background: '#E8DEC8' }}>
              <div style={{ marginBottom: '6px' }}>
                <label style={label}>Name</label>
                <input placeholder="e.g. Adam Smith" value={authorForm.name} onChange={e => setAuthorForm({ ...authorForm, name: e.target.value })} style={input} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={label}>Description</label>
                <input placeholder="e.g. Technical analyst" value={authorForm.description} onChange={e => setAuthorForm({ ...authorForm, description: e.target.value })} style={input} />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={saveAuthor} style={{ flex: 1, background: '#C8903A', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '12px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setShowAddAuthor(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #C8B89A', borderRadius: '6px', padding: '6px', fontSize: '12px', color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflow: 'auto', padding: '6px' }}>
            {authors.length === 0 && <div style={{ fontSize: '12px', color: '#9C856A', padding: '10px' }}>No people added yet.</div>}
            {authors.map(author => (
              <div key={author.id} onClick={() => { setSelectedAuthor(author); setExpandedArticle(null) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: selectedAuthor?.id === author.id ? '#F5EFE4' : 'transparent', border: selectedAuthor?.id === author.id ? '1px solid #C8903A' : '1px solid transparent', marginBottom: '3px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: author.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {author.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#2B2318', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{author.name}</div>
                  {author.description && <div style={{ fontSize: '10px', color: '#9C856A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{author.description}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); deleteAuthor(author.id) }} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '13px', padding: '2px', flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {!selectedAuthor && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', fontSize: '13px', color: '#9C856A' }}>
              Select a person from the left to view their articles
            </div>
          )}

          {selectedAuthor && (
            <>
              <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: selectedAuthor.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'white' }}>
                    {selectedAuthor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318' }}>{selectedAuthor.name}</div>
                    {selectedAuthor.description && <div style={{ fontSize: '11px', color: '#9C856A' }}>{selectedAuthor.description}</div>}
                  </div>
                </div>
                <button onClick={() => { setShowAddArticle(!showAddArticle); setExpandedArticle(null) }} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Add Article</button>
              </div>

              {showAddArticle && (
                <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label style={label}>Title</label><input placeholder="Article title" value={articleForm.title} onChange={e => setArticleForm({ ...articleForm, title: e.target.value })} style={input} /></div>
                    <div><label style={label}>Date Read</label><input type="date" value={articleForm.date_read} onChange={e => setArticleForm({ ...articleForm, date_read: e.target.value })} style={input} /></div>
                    <div><label style={label}>Tags (comma separated)</label><input placeholder="e.g. TA, BTC" value={articleForm.tags} onChange={e => setArticleForm({ ...articleForm, tags: e.target.value })} style={input} /></div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={label}>URL (optional — if it has a link)</label>
                    <input placeholder="https://..." value={articleForm.url} onChange={e => setArticleForm({ ...articleForm, url: e.target.value })} style={input} />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={label}>Paste article content (or key notes)</label>
                    <textarea placeholder="Paste the full article here, or write your key takeaways..." value={articleForm.content} onChange={e => setArticleForm({ ...articleForm, content: e.target.value })} style={{ ...input, height: '120px', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={saveArticle} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save Article</button>
                    <button onClick={() => setShowAddArticle(false)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {articles.length === 0 && <div style={{ fontSize: '13px', color: '#9C856A' }}>No articles added yet for {selectedAuthor.name}.</div>}
                {articles.map(article => (
                  <div key={article.id} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', overflow: 'hidden' }}>
                    <div onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer' }}>
                      <div style={{ fontSize: '10px', color: '#9C856A', marginRight: '2px' }}>{expandedArticle === article.id ? '▼' : '▶'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{article.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {article.date_read && <span style={{ fontSize: '10px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace' }}>{article.date_read}</span>}
                          {article.url && <span style={{ fontSize: '10px', color: '#C8903A' }}>has link</span>}
                          {article.notes && <span style={{ fontSize: '10px', color: '#9C856A' }}>has content</span>}
                          {article.tags?.map(tag => (
                            <span key={tag} style={{ fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '99px', background: '#F5E6C8', color: '#7A4F1A', border: '1px solid #C8903A' }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteArticle(article.id) }} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', flexShrink: 0 }}>✕</button>
                    </div>
                    {expandedArticle === article.id && (
                      <div style={{ borderTop: '1px solid #C8B89A', padding: '14px', background: '#F5EFE4' }}>
                        {article.url && (
                          <a href={article.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#C8903A', textDecoration: 'none', fontWeight: 600, marginBottom: article.notes ? '10px' : '0' }}>
                            Open original article ↗
                          </a>
                        )}
                        {article.notes && (
                          <div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{article.notes}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
export default Education