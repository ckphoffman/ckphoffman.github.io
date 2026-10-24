import { useState, useEffect } from 'react';
import YouTube from 'react-youtube';

interface PlayerProps {
  videoId: string;
  startTime?: number;
}

const Player = ({ videoId, startTime = 0 }: PlayerProps) => {
  const [player, setPlayer] = useState<any>(null);

  // YouTube播放器选项
  const opts = {
    height: '360',
    width: '640',
    playerVars: {
      autoplay: 1,
      start: Math.floor(startTime),
    },
  };

  // 播放器就绪时的回调
  const onReady = (event: any) => {
    setPlayer(event.target);
  };

  // 当startTime变化时，跳转到指定时间
  useEffect(() => {
    if (player && startTime) {
      player.seekTo(startTime);
      player.playVideo();
    }
  }, [player, startTime]);

  return (
    <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onReady}
        className="w-full h-full"
      />
    </div>
  );
};

export default Player;