/**
 * カードアイテムコンポーネント
 * 請求書作成、請求書発行、顧客管理などの機能カードを表示
 */
interface CardItemProps {
  iconSrc: string;
  title: string;
  onClick?: () => void;
}

export const CardItem = ({ iconSrc, title, onClick }: CardItemProps) => {
  return (
    <div className="card-item" onClick={onClick}>
      <div className="card-icon">
        <img className="card-icon-raw" src={iconSrc} alt={title} />
      </div>
      <div className="card-label">
        <div className="card-label-frame">
          <div className="card-title">{title}</div>
        </div>
      </div>
    </div>
  );
};
