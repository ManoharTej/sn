import api from './client'

export const tutorApi = {
  sendMessage:     (data)       => api.post('/tutor/message', data),
  listSessions:    ()           => api.get('/tutor/sessions'),
  getSession:      (id)         => api.get(`/tutor/sessions/${id}`),
  deleteSession:   (id)         => api.delete(`/tutor/sessions/${id}`),
  quickQuestions:  ()           => api.get('/tutor/quick-questions'),
  ingestSession:   (id)         => api.post(`/tutor/sessions/${id}/ingest`),
}
