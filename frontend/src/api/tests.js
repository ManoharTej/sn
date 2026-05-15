import api from './client'

export const testsApi = {
  list:            ()           => api.get('/tests'),
  get:             (id)         => api.get(`/tests/${id}`),
  results:         (id)         => api.get(`/tests/${id}/results`),
  createTopic:     (topic_id, question_count=15) => api.post('/tests/topic-based', { topic_id, question_count }),
  createFullExam:  ()           => api.post('/tests/full-exam'),
  createDaily:     ()           => api.post('/tests/daily'),
  createWeakTopics:()           => api.post('/tests/weak-topics'),
  submitAnswer:    (id, data)   => api.post(`/tests/${id}/submit-answer`, data),
  complete:        (id, secs)   => api.post(`/tests/${id}/complete`, null, { params: { time_taken_seconds: secs } }),
}
