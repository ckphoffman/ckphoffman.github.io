import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { wordsApi } from '../lib/api';
import Player from '../components/Player';

interface WordDetail {
  id: number;
  word: string;
  count: number;
  is_favorite: number;
  first_seen_at: string;
  occurrences: {
    video_id: string;
    video_title: string;
    subtitle_id: number;
    start_time: number;
    text: string;
  }[];
}

const WordDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [wordDetail, setWordDetail] = useState<WordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string>('');
  const [activeStartTime, setActiveStartTime] = useState<number>(0);

  useEffect(() => {
    const fetchWordDetail = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await wordsApi.getWordDetail(parseInt(id));
        setWordDetail(data);
        
        // 如果有出现记录，默认设置第一个为活跃视频
        if (data.occurrences && data.occurrences.length > 0) {
          setActiveVideoId(data.occurrences[0].video_id);
          setActiveStartTime(data.occurrences[0].start_time);
        }
      } catch (err) {
        console.error('Failed to fetch word detail:', err);
        setError('获取单词详情失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };

    fetchWordDetail();
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!wordDetail) return;
    
    try {
      const newFavoriteStatus = wordDetail.is_favorite === 1 ? 0 : 1;
      await wordsApi.updateWordFavorite(wordDetail.id, newFavoriteStatus);
      setWordDetail({
        ...wordDetail,
        is_favorite: newFavoriteStatus
      });
    } catch (err) {
      console.error('Failed to update favorite status:', err);
      alert('更新收藏状态失败，请稍后再试');
    }
  };

  const handlePlaySubtitle = (videoId: string, startTime: number) => {
    setActiveVideoId(videoId);
    setActiveStartTime(startTime);
  };

  // 高亮显示单词在字幕中的出现
  const highlightWord = (text: string, word: string) => {
    if (!word) return text;
    
    // 创建一个不区分大小写的正则表达式
    const regex = new RegExp(`(${word})`, 'gi');
    
    // 将文本分割成匹配和非匹配部分
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => {
          // 检查当前部分是否匹配单词（不区分大小写）
          if (part.toLowerCase() === word.toLowerCase()) {
            return <span key={i} className="bg-yellow-200 dark:bg-yellow-700 font-bold">{part}</span>;
          }
          return part;
        })}
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!wordDetail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <p className="text-gray-600 dark:text-gray-400">未找到单词</p>
          <Link to="/words" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">
            返回单词列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/words" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          &larr; 返回单词列表
        </Link>
        
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            {wordDetail.word}
            <span className="ml-4 text-lg bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
              出现 {wordDetail.count} 次
            </span>
          </h1>
          
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${wordDetail.is_favorite 
              ? 'text-yellow-500 hover:text-yellow-600 focus:ring-yellow-500' 
              : 'text-gray-400 hover:text-yellow-500 focus:ring-yellow-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path 
                fillRule="evenodd" 
                d="M10 15.585l-7.07 3.715 1.35-7.865L.36 7.215l7.88-1.145L10 0l1.76 6.07 7.88 1.145-3.92 3.82 1.35 7.865L10 15.585z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          首次出现于: {new Date(wordDetail.first_seen_at).toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* 视频播放器 */}
      {activeVideoId && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">视频播放</h2>
          <div className="aspect-w-16 aspect-h-9">
            <Player videoId={activeVideoId} startTime={activeStartTime} />
          </div>
        </div>
      )}

      {/* 出现记录列表 */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">出现记录</h2>
        
        {wordDetail.occurrences.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">暂无出现记录</p>
        ) : (
          <div className="space-y-4">
            {wordDetail.occurrences.map((occurrence, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">{occurrence.video_title}</h3>
                  <button
                    onClick={() => handlePlaySubtitle(occurrence.video_id, occurrence.start_time)}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    播放 ({Math.floor(occurrence.start_time / 60)}:{(occurrence.start_time % 60).toString().padStart(2, '0')})
                  </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  {highlightWord(occurrence.text, wordDetail.word)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordDetail;