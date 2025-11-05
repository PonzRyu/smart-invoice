/**
 * カードアイテムコンポーネント
 * 請求書作成、請求書発行、顧客管理などの機能カードを表示
 */
interface CardItemProps {
  iconSrc: string;
  title: string;
}

export const CardItem = ({ iconSrc, title }: CardItemProps) => {
  return (
    <div className="card-item">
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
