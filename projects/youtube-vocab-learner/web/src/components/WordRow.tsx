import { Link } from 'react-router-dom';

interface WordRowProps {
  word: {
    id: number;
    word: string;
    count: number;
    is_favorite: number;
    first_seen_at: string;
  };
  onToggleFavorite: (id: number, isFavorite: boolean) => void;
}

const WordRow = ({ word, onToggleFavorite }: WordRowProps) => {
  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
      <td className="px-6 py-4 whitespace-nowrap">
        <Link 
          to={`/words/${word.id}`}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {word.word}
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {word.count}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {formatDate(word.first_seen_at)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <button
          onClick={() => onToggleFavorite(word.id, !word.is_favorite)}
          className={`p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${word.is_favorite 
            ? 'text-yellow-500 hover:text-yellow-600 focus:ring-yellow-500' 
            : 'text-gray-400 hover:text-yellow-500 focus:ring-yellow-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path 
              fillRule="evenodd" 
              d="M10 15.585l-7.07 3.715 1.35-7.865L.36 7.215l7.88-1.145L10 0l1.76 6.07 7.88 1.145-3.92 3.82 1.35 7.865L10 15.585z" 
              clipRule="evenodd" 
            />
          </svg>
        </button>
      </td>
    </tr>
  );
};

export default WordRow;