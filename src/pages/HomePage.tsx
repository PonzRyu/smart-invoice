import { TopBar } from '../parts/TopBar';
import { NavigationRail } from '../parts/NavigationRail';
import { CardGrid } from '../parts/CardGrid';
import { BottomBar } from '../parts/BottomBar';
import '../styles/styles.css';

/**
 * ホームページコンポーネント
 * アプリケーションのメインページ
 */
export const HomePage = () => {
  return (
    <div className="page">
      <div className="content">
        <CardGrid />
      </div>
      <TopBar />
      <NavigationRail />
      <BottomBar />
    </div>
  );
};
