import { useNavigate, useLocation } from 'react-router-dom';
import homeIcon from '../styles/raws/home_raw.svg';
import createInvoiceIcon from '../styles/raws/create_invoice_raw.svg';
import issueInvoiceIcon from '../styles/raws/issue_an_invoice_raw.svg';
import customerManagementIcon from '../styles/raws/customer_management_raw.svg';

/**
 * ナビゲーションレールコンポーネント
 * 左側のサイドバーナビゲーションを表示
 */
export const NavigationRail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      icon: createInvoiceIcon,
      title: '請求書作成',
      path: '/CreateInvoice',
    },
    {
      icon: issueInvoiceIcon,
      title: '請求書発行',
      path: '',
    },
    {
      icon: customerManagementIcon,
      title: '顧客管理',
      path: '',
    },
  ];

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleNavItemClick = (path: string) => {
    if (path) {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="navigation-rail">
      <div className="menu-fab">
        <div
          className={`fab-icon-container ${location.pathname !== '/' ? 'transparent' : ''}`}
          onClick={handleHomeClick}
        >
          <div className="fab-layer">
            <div className="nav-icon">
              <img className="icon-home" src={homeIcon} alt="ホーム" />
            </div>
          </div>
        </div>
      </div>
      <div className="segments">
        {navItems.map((item, index) => (
          <div
            key={index}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNavItemClick(item.path)}
          >
            <div className="nav-icon-container">
              <div className="nav-icon-layer">
                <div className="nav-icon">
                  <img
                    className="nav-icon-raw"
                    src={item.icon}
                    alt={item.title}
                  />
                </div>
              </div>
            </div>
            <div className="nav-item-title">{item.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
