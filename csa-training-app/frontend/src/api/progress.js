import api from './client'

export const progressApi = {
  overview:    () => api.get('/progress/overview'),
  topics:      () => api.get('/progress/topics'),
  weakTopics:  () => api.get('/progress/weak-topics'),
  activity:    () => api.get('/progress/activity'),
  testHistory: () => api.get('/progress/test-history'),
}
