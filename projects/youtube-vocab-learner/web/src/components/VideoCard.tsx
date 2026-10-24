import { Link } from 'react-router-dom';

interface VideoCardProps {
  video: {
    id: number;
    video_id: string;
    title: string;
    author: string;
    url: string;
    timestamp: string;
  };
  onDelete?: (id: number) => void;
}

const VideoCard = ({ video, onDelete }: VideoCardProps) => {
  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 生成YouTube缩略图URL
  const thumbnailUrl = `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="relative">
        <img 
          src={thumbnailUrl} 
          alt={video.title} 
          className="w-full h-48 object-cover"
        />
        <a 
          href={video.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity"
        >
          <span className="text-white font-medium">在YouTube上观看</span>
        </a>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
          {video.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {video.author}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          添加于 {formatDate(video.timestamp)}
        </p>
        
        <div className="mt-4 flex justify-between">
          <a 
            href={video.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            查看原视频
          </a>
          
          {onDelete && (
            <button
              onClick={() => onDelete(video.id)}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;