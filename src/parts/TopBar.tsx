import arrowBackIcon from '../styles/raws/arrow_back_raw.svg';

/**
 * トップバーコンポーネント
 * アプリケーションの上部ナビゲーションとタイトルを表示
 */
export const TopBar = () => {
  return (
    <div className="top-bar">
      <div className="top-navigation-bar">
        <div className="top-bar-icon-container">
          <div className="top-bar-icon-content">
            <div className="top-bar-icon-layer">
              <img className="top-bar-icon" src={arrowBackIcon} alt="戻る" />
            </div>
          </div>
        </div>
        <div className="brand-name">SOLUM JAPAN</div>
      </div>
      <div className="title-bar">
        <div className="app-title">
          <div className="headline">AIMS SaaS INVOICE</div>
        </div>
      </div>
    </div>
  );
};
