import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// 视频相关API
export const videosApi = {
  // 获取所有视频
  getAll: async () => {
    const response = await api.get('/videos');
    return response.data;
  },
  
  // 获取单个视频详情
  getById: async (id: string) => {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  },
  
  // 删除视频
  delete: async (id: string) => {
    const response = await api.delete(`/videos/${id}`);
    return response.data;
  },
};

// 单词相关API
export const wordsApi = {
  // 获取所有单词（支持排序和筛选）
  getAll: async (params: { sort?: string; order?: 'asc' | 'desc'; favorite?: boolean }) => {
    const response = await api.get('/words', { params });
    return response.data;
  },
  
  // 获取单个单词详情
  getById: async (id: string) => {
    const response = await api.get(`/words/${id}`);
    return response.data;
  },
  
  // 更新单词收藏状态
  updateFavorite: async (id: string, isFavorite: boolean) => {
    const response = await api.patch(`/words/${id}/favorite`, { is_favorite: isFavorite });
    return response.data;
  },
};

// 字幕相关API
export const subtitlesApi = {
  // 获取视频的字幕
  getByVideoId: async (videoId: string) => {
    const response = await api.get(`/subtitles/${videoId}`);
    return response.data;
  },
};

export default {
  videos: videosApi,
  words: wordsApi,
  subtitles: subtitlesApi,
};