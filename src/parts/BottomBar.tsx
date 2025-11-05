/**
 * ボトムバーコンポーネント
 * アプリケーションの下部にバージョン情報と作成者名を表示
 */
interface BottomBarProps {
  version?: string;
  author?: string;
}

export const BottomBar = ({
  version = '0.0.1-alpha',
  author = 'https://github.com/PonzRyu',
}: BottomBarProps) => {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-left">
        <span className="bottom-bar-text">Version {version}</span>
      </div>
      <div className="bottom-bar-right">
        <span className="bottom-bar-text">
          Designed & Developed by{' '}
          <a href={author} target="_blank" rel="noopener noreferrer">
            PonzRyu
          </a>
        </span>
      </div>
    </div>
  );
};
