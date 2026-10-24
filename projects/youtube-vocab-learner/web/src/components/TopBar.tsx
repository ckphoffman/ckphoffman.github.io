import { Link, useLocation } from 'react-router-dom';

const TopBar = () => {
  const location = useLocation();
  
  // 判断当前路径，用于高亮当前页面的导航项
  const isActive = (path: string) => {
    return location.pathname === path || 
           (path === '/videos' && (location.pathname === '/' || location.pathname.startsWith('/videos')));
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-red-600 dark:text-red-400">
              英语学习助手
            </Link>
          </div>
          
          <nav className="flex space-x-8">
            <Link 
              to="/videos" 
              className={`text-sm font-medium ${isActive('/videos') 
                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              我的视频
            </Link>
            <Link 
              to="/words" 
              className={`text-sm font-medium ${isActive('/words') 
                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              我的单词
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default TopBar;