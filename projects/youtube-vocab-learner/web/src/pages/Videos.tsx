import { useState, useEffect } from 'react';
import { videosApi } from '../lib/api';
import VideoCard from '../components/VideoCard';

interface Video {
  id: number;
  title: string;
  author: string;
  video_id: string;
  thumbnail_url: string;
  created_at: string;
}

const Videos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const data = await videosApi.fetchVideos();
      setVideos(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setError('获取视频列表失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDeleteVideo = async (id: number) => {
    if (!window.confirm('确定要删除这个视频吗？这将同时删除所有相关的字幕和单词统计数据。')) {
      return;
    }

    try {
      await videosApi.deleteVideo(id);
      // 删除成功后刷新列表
      fetchVideos();
    } catch (err) {
      console.error('Failed to delete video:', err);
      alert('删除视频失败，请稍后再试');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">我的视频</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600 dark:text-gray-400">暂无视频</p>
          <p className="mt-2 text-gray-500 dark:text-gray-500">使用Chrome插件添加YouTube视频</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onDelete={() => handleDeleteVideo(video.id)} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Videos;