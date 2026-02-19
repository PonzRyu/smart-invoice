import { useNavigate, useLocation } from 'react-router-dom';
import homeIcon from '../styles/raws/home_raw.svg';
import createInvoiceIcon from '../styles/raws/create_invoice_raw.svg';
import issueInvoiceIcon from '../styles/raws/issue_an_invoice_raw.svg';
import customerManagementIcon from '../styles/raws/customer_management_raw.svg';
import manualIcon from '../styles/raws/manual_raw.svg';
import releaseNoteIcon from '../styles/raws/release_note_raw.svg';

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
      path: '/IssueInvoice',
    },
    {
      icon: customerManagementIcon,
      title: '顧客管理',
      path: '/Customers',
    },
    {
      icon: manualIcon,
      title: 'マニュアル',
      path: '/Manual',
    },
    {
      icon: releaseNoteIcon,
      title: '変更履歴',
      path: '/ReleaseNotes',
    },
  ];

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleNavItemClick = (path: string) => {
    if (path) {
      // マニュアルの場合は外部URLを開く
      if (path === '/Manual') {
        window.open(
          'https://solumgroupjpn.sharepoint.com/:fl:/g/contentstorage/CSP_4b13360e-0350-4f12-9d22-554928f23750/IQAwqnubJRuFSpCQmygu15LvAekU_xdrr7QCW8IhLL1GEM4?e=YRMPwK&nav=cz0lMkZjb250ZW50c3RvcmFnZSUyRkNTUF80YjEzMzYwZS0wMzUwLTRmMTItOWQyMi01NTQ5MjhmMjM3NTAmZD1iJTIxRGpZVFMxQURFay1kSWxWSktQSTNVRFBCR1lLNmVLbEVrVE9DdEVvVWU4dHR1VDNHN05iS1I3ZUNIaEJGN0tMNSZmPTAxWk9QVTdDUlFWSjVaV0pJM1FWRkpCRUUzRkFYTlBFWFAmYz0lMkYmYT1Mb29wQXBwJnA9JTQwZmx1aWR4JTJGbG9vcC1wYWdlLWNvbnRhaW5lciZ4PSU3QiUyMnclMjIlM0ElMjJUMFJUVUh4emIyeDFiV2R5YjNWd2FuQnVMbk5vWVhKbGNHOXBiblF1WTI5dGZHSWhSR3BaVkZNeFFVUkZheTFrU1d4V1NrdFFTVE5WUkZCQ1IxbExObVZMYkVWclZFOURkRVZ2VldVNGRIUjFWRE5ITjA1aVMxSTNaVU5JYUVKR04wdE1OWHd3TVZwUFVGVTNRMU0xTTFaQ1RWRlpWemN6UmtoTVNFZzBVVEpLV1ZGUFUxQlAlMjIlMkMlMjJpJTIyJTNBJTIyZmYzMWNlMWMtNWI0OS00ZTg3LWJlMWYtNTMxYjllNTA5NWUzJTIyJTdE',
          '_blank'
        );
      } else if (path === '/ReleaseNotes') {
        // 変更履歴の場合は外部URLを開く
        window.open(
          'https://solumgroupjpn.sharepoint.com/:fl:/g/contentstorage/CSP_4b13360e-0350-4f12-9d22-554928f23750/IQAbd8x1scW4ToSPCdo1vmHwAQqTVHzWlywJIPzji6644TE?e=8Zse6y&nav=cz0lMkZjb250ZW50c3RvcmFnZSUyRkNTUF80YjEzMzYwZS0wMzUwLTRmMTItOWQyMi01NTQ5MjhmMjM3NTAmZD1iJTIxRGpZVFMxQURFay1kSWxWSktQSTNVRFBCR1lLNmVLbEVrVE9DdEVvVWU4dHR1VDNHN05iS1I3ZUNIaEJGN0tMNSZmPTAxWk9QVTdDUTNPN0dITE1PRlhCSElKRFlKM0kyMzRZUFEmYz0lMkYmYT1Mb29wQXBwJnA9JTQwZmx1aWR4JTJGbG9vcC1wYWdlLWNvbnRhaW5lciZ4PSU3QiUyMnclMjIlM0ElMjJUMFJUVUh4emIyeDFiV2R5YjNWd2FuQnVMbk5vWVhKbGNHOXBiblF1WTI5dGZHSWhSR3BaVkZNeFFVUkZheTFrU1d4V1NrdFFTVE5WUkZCQ1IxbExObVZMYkVWclZFOURkRVZ2VldVNGRIUjFWRE5ITjA1aVMxSTNaVU5JYUVKR04wdE1OWHd3TVZwUFVGVTNRMU0xTTFaQ1RWRlpWemN6UmtoTVNFZzBVVEpLV1ZGUFUxQlAlMjIlMkMlMjJpJTIyJTNBJTIyYThhM2NhNzYtMWU2Zi00ZGEzLTgxZWUtZWNjYjE3YzAwNGM2JTIyJTdE',
          '_blank'
        );
      } else {
        navigate(path);
      }
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
