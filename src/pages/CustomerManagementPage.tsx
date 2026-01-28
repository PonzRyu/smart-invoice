import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '../parts/TopBar';
import { NavigationRail } from '../parts/NavigationRail';
import { BottomBar } from '../parts/BottomBar';
import modifyIcon from '../styles/raws/modify_raw.svg';
import deleteIcon from '../styles/raws/delete_raw.svg';
import searchIcon from '../styles/raws/search_raw.svg';
import arrowBackIcon from '../styles/raws/list_arrow_back_raw.svg';
import arrowNextIcon from '../styles/raws/list_arrow_next_raw.svg';
import arrowDropDownIcon from '../styles/raws/arrow_drop_down_raw.svg';
import '../styles/styles.css';
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  type Customer,
  updateCustomer,
} from '../services/customerService';

/**
 * 顧客管理ページコンポーネント
 * 顧客情報の一覧表示、追加、編集、削除機能を提供
 */
export const CustomerManagementPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedCustomers, setEditedCustomers] = useState<Map<number, Customer>>(
    new Map()
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState<
    Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'si_partner_name'>
  >({
    company_name: '',
    company_code: '',
    currency: '',
    unit_price: 0,
  });

  // 通貨オプション
  const currencyOptions = ['$', '¥'];

  // 検索とページネーション
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const fetchCustomersAndSet = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCustomers]);

  // 顧客データ取得
  useEffect(() => {
    fetchCustomersAndSet();
  }, [fetchCustomersAndSet]);

  // 編集開始
  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    const newMap = new Map(editedCustomers);
    // unit_priceを確実に数値型にして保存
    newMap.set(customer.id, {
      ...customer,
      unit_price:
        typeof customer.unit_price === 'string'
          ? parseFloat(customer.unit_price)
          : customer.unit_price,
    });
    setEditedCustomers(newMap);
  };

  // 編集キャンセル
  const handleCancelEdit = (id: number) => {
    setEditingId(null);
    const newMap = new Map(editedCustomers);
    newMap.delete(id);
    setEditedCustomers(newMap);
  };

  // 編集内容の更新
  const handleEditChange = (
    id: number,
    field: keyof Customer,
    value: string | number
  ) => {
    const newMap = new Map(editedCustomers);
    const customer = newMap.get(id);
    if (customer) {
      // unit_priceの場合は数値変換を確実に行う
      let processedValue = value;
      if (field === 'unit_price') {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        processedValue = isNaN(numValue) ? 0 : numValue;
      }
      newMap.set(id, { ...customer, [field]: processedValue });
      setEditedCustomers(newMap);
    }
  };

  // 削除
  const handleDelete = async (id: number) => {
    if (!confirm('この顧客を削除してもよろしいですか？')) {
      return;
    }

    try {
      await deleteCustomer(id);
      await fetchCustomersAndSet();
      alert('削除が完了しました。');
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('削除に失敗しました。');
    }
  };

  // 追加開始
  const handleAddNew = () => {
    setIsAdding(true);
    setNewCustomer({
      company_name: '',
      company_code: '',
      currency: '',
      unit_price: 0,
    });
  };

  // 追加キャンセル
  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewCustomer({
      company_name: '',
      company_code: '',
      currency: '',
      unit_price: 0,
    });
  };

  // 新規顧客の入力変更
  const handleNewCustomerChange = (
    field: keyof Omit<
      Customer,
      'id' | 'created_at' | 'updated_at' | 'si_partner_name'
    >,
    value: string | number
  ) => {
    // unit_priceの場合は数値変換を確実に行う
    if (field === 'unit_price') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      setNewCustomer({
        ...newCustomer,
        [field]: isNaN(numValue) ? 0 : numValue,
      });
    } else {
      setNewCustomer({ ...newCustomer, [field]: value });
    }
  };

  // 保存
  const handleSave = async () => {
    try {
      // 新規顧客追加時のバリデーション
      if (isAdding) {
        if (!newCustomer.company_name || !newCustomer.company_code) {
          alert('顧客名と顧客コードは必須項目です。');
          return;
        }
        if (!newCustomer.currency) {
          alert('通貨単位は必須項目です。');
          return;
        }
        if (isNaN(newCustomer.unit_price) || newCustomer.unit_price < 0) {
          alert('単価は有効な数値を入力してください。');
          return;
        }
      }

      // 編集された顧客の更新
      for (const [id, customer] of editedCustomers) {
        await updateCustomer(id, {
          company_name: customer.company_name,
          company_code: customer.company_code,
          currency: customer.currency,
          unit_price: customer.unit_price,
        });
      }

      // 新規顧客の追加
      if (isAdding) {
        await createCustomer({
          company_name: newCustomer.company_name,
          company_code: newCustomer.company_code,
          currency: newCustomer.currency,
          unit_price: Number(newCustomer.unit_price),
        });
      }

      // 状態リセットとデータ再取得
      setEditedCustomers(new Map());
      setEditingId(null);
      setIsAdding(false);
      await fetchCustomersAndSet();
      alert('保存が完了しました。');
    } catch (error) {
      console.error('Error saving:', error);
      alert(error instanceof Error ? error.message : '保存に失敗しました。');
    }
  };

  // 日時フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 顧客データの取得（編集中の場合は編集中のデータ、そうでない場合は元のデータ）
  const getCustomerData = (customer: Customer) => {
    const data =
      editingId === customer.id
        ? editedCustomers.get(customer.id) || customer
        : customer;

    // unit_priceを確実に数値型にする
    return {
      ...data,
      unit_price:
        typeof data.unit_price === 'string'
          ? parseFloat(data.unit_price)
          : data.unit_price,
    };
  };

  // フィルタリング
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    return customer.company_code
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  // ページネーション
  const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // 検索クエリが変更されたときにページをリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, rowsPerPage]);

  // ページ変更
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="page">
      <div className="content">
        <div className="customer-management-container">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">読み込み中...</div>
            </div>
          ) : (
            <>
              {/* 検索バーとページネーションコントロール */}
              <div className="customer-toolbar">
                <div className="search-container">
                  <img src={searchIcon} alt="検索" className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="顧客コードを入力する"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="pagination-controls">
                  <div className="rows-per-page">
                    <span className="pagination-label">Rows per page:</span>
                    <select
                      className="rows-per-page-select"
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <img
                      src={arrowDropDownIcon}
                      alt=""
                      className="dropdown-icon"
                    />
                  </div>
                  <div className="pagination-info">
                    {startIndex + 1}-
                    {Math.min(endIndex, filteredCustomers.length)} of{' '}
                    {filteredCustomers.length}
                  </div>
                  <div className="pagination-buttons">
                    <button
                      className="pagination-button"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      <img
                        src={arrowBackIcon}
                        alt="前へ"
                        className="pagination-arrow"
                      />
                    </button>
                    <button
                      className="pagination-button"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
                    >
                      <img
                        src={arrowNextIcon}
                        alt="次へ"
                        className="pagination-arrow"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="customer-list">
                {/* ヘッダー */}
                <div className="customer-list-header">
                  <div className="customer-list-cell cell-name">顧客名</div>
                  <div className="customer-list-cell cell-code">顧客コード</div>
                  <div className="customer-list-cell cell-currency">
                    通貨単位
                  </div>
                  <div className="customer-list-cell cell-price">単価</div>
                  <div className="customer-list-cell cell-date">更新日</div>
                  <div className="customer-list-cell cell-actions"></div>
                </div>

                {/* 顧客リスト */}
                {paginatedCustomers.map((customer) => {
                  const data = getCustomerData(customer);
                  const isEditing = editingId === customer.id;

                  return (
                    <div
                      key={customer.id}
                      className={`customer-list-row ${isEditing ? 'editing' : ''}`}
                    >
                      <div className="customer-list-cell cell-name">
                        {isEditing ? (
                          <input
                            type="text"
                            className="cell-input"
                            value={data.company_name}
                            onChange={(e) =>
                              handleEditChange(
                                customer.id,
                                'company_name',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          data.company_name
                        )}
                      </div>
                      <div className="customer-list-cell cell-code">
                        {isEditing ? (
                          <input
                            type="text"
                            className="cell-input"
                            value={data.company_code}
                            onChange={(e) =>
                              handleEditChange(
                                customer.id,
                                'company_code',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          data.company_code
                        )}
                      </div>
                      <div className="customer-list-cell cell-currency">
                        {isEditing ? (
                          <select
                            className="cell-select"
                            value={data.currency}
                            onChange={(e) =>
                              handleEditChange(
                                customer.id,
                                'currency',
                                e.target.value
                              )
                            }
                          >
                            {currencyOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          data.currency
                        )}
                      </div>
                      <div className="customer-list-cell cell-price">
                        {isEditing ? (
                          <input
                            type="number"
                            className="cell-input"
                            value={data.unit_price}
                            onChange={(e) =>
                              handleEditChange(
                                customer.id,
                                'unit_price',
                                e.target.value
                              )
                            }
                            step="0.000001"
                            min="0"
                          />
                        ) : (
                          Number(data.unit_price).toFixed(6)
                        )}
                      </div>
                      <div className="customer-list-cell cell-date">
                        {formatDate(data.updated_at)}
                      </div>
                      <div className="customer-list-cell cell-actions">
                        {isEditing ? (
                          <button
                            className="action-button cancel-button"
                            onClick={() => handleCancelEdit(customer.id)}
                          >
                            キャンセル
                          </button>
                        ) : (
                          <>
                            <button
                              className="action-icon-button"
                              onClick={() => handleEdit(customer)}
                              title="修正"
                            >
                              <img
                                src={modifyIcon}
                                alt="修正"
                                className="action-icon"
                              />
                            </button>
                            <button
                              className="action-icon-button"
                              onClick={() => handleDelete(customer.id)}
                              title="削除"
                            >
                              <img
                                src={deleteIcon}
                                alt="削除"
                                className="action-icon"
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 新規追加行 */}
                {isAdding && (
                  <div className="customer-list-row editing new-row">
                    <div className="customer-list-cell cell-name">
                      <input
                        type="text"
                        className="cell-input"
                        value={newCustomer.company_name}
                        onChange={(e) =>
                          handleNewCustomerChange(
                            'company_name',
                            e.target.value
                          )
                        }
                        placeholder="株式会社○○○○"
                      />
                    </div>
                    <div className="customer-list-cell cell-code">
                      <input
                        type="text"
                        className="cell-input"
                        value={newCustomer.company_code}
                        onChange={(e) =>
                          handleNewCustomerChange(
                            'company_code',
                            e.target.value
                          )
                        }
                        placeholder="○○○"
                      />
                    </div>
                    <div className="customer-list-cell cell-currency">
                      <select
                        className={`cell-select ${
                          newCustomer.currency === '' ? 'placeholder' : ''
                        }`}
                        value={newCustomer.currency}
                        onChange={(e) =>
                          handleNewCustomerChange('currency', e.target.value)
                        }
                      >
                        <option value="" disabled>
                          通貨を選択する
                        </option>
                        {currencyOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="customer-list-cell cell-price">
                      <input
                        type="number"
                        className="cell-input"
                        value={newCustomer.unit_price}
                        onChange={(e) =>
                          handleNewCustomerChange('unit_price', e.target.value)
                        }
                        step="0.000001"
                        placeholder="0.0000"
                        min="0"
                      />
                    </div>
                    <div className="customer-list-cell cell-date">-</div>
                    <div className="customer-list-cell cell-actions">
                      <button
                        className="action-button cancel-button"
                        onClick={handleCancelAdd}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ボタンエリア */}
              <div className="customer-actions">
                <button
                  className="btn btn-add"
                  onClick={handleAddNew}
                  disabled={isAdding || editingId !== null}
                >
                  追加
                </button>
                <button
                  className="btn btn-save"
                  onClick={handleSave}
                  disabled={editedCustomers.size === 0 && !isAdding}
                >
                  保存
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <TopBar headline="顧客管理" />
      <NavigationRail />
      <BottomBar />
    </div>
  );
};
