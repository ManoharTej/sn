import api from './client'

export const contentApi = {
  upload: (file, title, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    if (title) form.append('title', title)
    return api.post('/content/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    })
  },
  ingestUrl: (url, title) => api.post('/content/ingest-url', { url, title }),
  searchAndLearn: (topic) => api.post('/content/search-and-learn', { topic }),
  list: () => api.get('/content/list'),
  get: (id) => api.get(`/content/${id}`),
  delete: (id) => api.delete(`/content/${id}`),
  topics: () => api.get('/content/topics/all'),
}
