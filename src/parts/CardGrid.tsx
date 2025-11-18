import { useNavigate } from 'react-router-dom';
import { CardItem } from './CardItem';
import createInvoiceIcon from '../styles/raws/create_invoice_raw.svg';
import issueInvoiceIcon from '../styles/raws/issue_an_invoice_raw.svg';
import customerManagementIcon from '../styles/raws/customer_management_raw.svg';
import manualIcon from '../styles/raws/manual_raw.svg';
import releaseNoteIcon from '../styles/raws/release_note_raw.svg';

/**
 * カードグリッドコンポーネント
 * ホームページのメイン機能カードを表示
 */
export const CardGrid = () => {
  const navigate = useNavigate();

  const cards = [
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

  const handleCardClick = (path: string) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className="card-grid">
      {cards.map((card, index) => (
        <CardItem
          key={index}
          iconSrc={card.icon}
          title={card.title}
          onClick={() => handleCardClick(card.path)}
        />
      ))}
    </div>
  );
};
