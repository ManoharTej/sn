import api from './client'

export const questionsApi = {
  list:     (params) => api.get('/questions', { params }),
  get:      (id)     => api.get(`/questions/${id}`),
  count:    ()       => api.get('/questions/count'),
  generate: (content_source_id, max_per_chunk = 2) =>
    api.post('/questions/generate', { content_source_id, max_per_chunk }),
  flashcards: (params) => api.get('/questions/flashcards/all', { params }),
  dailyCards: ()       => api.get('/questions/flashcards/daily'),
  reviewCard: (id, correct) =>
    api.post(`/questions/flashcards/${id}/review`, { correct }),
}
