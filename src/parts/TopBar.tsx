import { useNavigate, useLocation } from 'react-router-dom';
import arrowBackIcon from '../styles/raws/arrow_back_raw.svg';

interface TopBarProps {
  headline?: string;
}

/**
 * トップバーコンポーネント
 * アプリケーションの上部ナビゲーションとタイトルを表示
 */
export const TopBar = ({ headline = 'AIMS SaaS INVOICE' }: TopBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <div className="top-bar">
      <div className="top-navigation-bar">
        {!isHomePage && (
          <div className="top-bar-icon-container">
            <div className="top-bar-icon-content" onClick={handleBackClick}>
              <div className="top-bar-icon-layer">
                <img className="top-bar-icon" src={arrowBackIcon} alt="戻る" />
              </div>
            </div>
          </div>
        )}
        <div className="brand-name">SOLUM JAPAN</div>
      </div>
      <div className="title-bar">
        <div className="app-title">
          <div className="headline">{headline}</div>
        </div>
      </div>
    </div>
  );
};
