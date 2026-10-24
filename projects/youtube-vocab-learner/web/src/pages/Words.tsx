import { useState, useEffect } from 'react';
import { wordsApi } from '../lib/api';
import WordRow from '../components/WordRow';

interface Word {
  id: number;
  word: string;
  count: number;
  is_favorite: number;
  first_seen_at: string;
}

type SortField = 'count' | 'word' | 'first_seen_at';
type SortOrder = 'asc' | 'desc';

const Words = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const fetchWords = async () => {
    try {
      setLoading(true);
      const data = await wordsApi.fetchWords({
        sort_by: sortField,
        sort_order: sortOrder,
        favorites_only: showFavoritesOnly ? 1 : 0
      });
      setWords(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch words:', err);
      setError('获取单词列表失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, [sortField, sortOrder, showFavoritesOnly]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // 如果点击的是当前排序字段，则切换排序顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 如果点击的是新字段，则设置为该字段并默认降序
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleToggleFavorite = async (id: number, isFavorite: boolean) => {
    try {
      await wordsApi.updateWordFavorite(id, isFavorite ? 1 : 0);
      // 更新本地状态
      setWords(words.map(word => 
        word.id === id ? { ...word, is_favorite: isFavorite ? 1 : 0 } : word
      ));
    } catch (err) {
      console.error('Failed to update favorite status:', err);
      alert('更新收藏状态失败，请稍后再试');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return null;
    
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 ml-1 inline-block" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 inline-block" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">我的单词</h1>
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={showFavoritesOnly}
              onChange={() => setShowFavoritesOnly(!showFavoritesOnly)}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">只显示收藏</span>
          </label>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600 dark:text-gray-400">暂无单词</p>
          <p className="mt-2 text-gray-500 dark:text-gray-500">使用Chrome插件添加YouTube视频来收集单词</p>
        </div>
      ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 cursor-pointer"
                  onClick={() => handleSort('word')}
                >
                  <span className="flex items-center">
                    单词 {getSortIcon('word')}
                  </span>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-center cursor-pointer"
                  onClick={() => handleSort('count')}
                >
                  <span className="flex items-center justify-center">
                    出现次数 {getSortIcon('count')}
                  </span>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 cursor-pointer"
                  onClick={() => handleSort('first_seen_at')}
                >
                  <span className="flex items-center">
                    首次出现 {getSortIcon('first_seen_at')}
                  </span>
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  收藏
                </th>
              </tr>
            </thead>
            <tbody>
              {words.map((word) => (
                <WordRow 
                  key={word.id} 
                  word={word} 
                  onToggleFavorite={handleToggleFavorite} 
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Words;