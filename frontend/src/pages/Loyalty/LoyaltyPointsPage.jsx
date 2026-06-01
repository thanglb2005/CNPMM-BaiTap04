import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaCoins, FaHistory, FaGift, FaCrown, FaStar, FaCheck } from 'react-icons/fa';
import Layout from '../../components/Layout/Layout';
import { fetchMyPoints, fetchPointsHistory, fetchAvailableRewards, redeemReward } from '../../store/slices/loyaltySlice';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

export default function LoyaltyPointsPage() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { points, history, availableRewards, loading } = useSelector((state) => state.loyalty);
  const [activeTab, setActiveTab] = useState('points');
  const [redeeming, setRedeeming] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyPoints());
      dispatch(fetchAvailableRewards());
    }
  }, [dispatch, isAuthenticated]);

  const loadHistory = (page = 1) => {
    dispatch(fetchPointsHistory({ page, limit: 20 }));
  };

  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated) {
      loadHistory();
    }
  }, [activeTab, isAuthenticated, dispatch]);

  const handleRedeem = async (reward) => {
    if (points?.currentBalance < reward.pointsCost) {
      toast.error('Số dư điểm không đủ');
      return;
    }
    if (!window.confirm(`Đổi ${reward.pointsCost} điểm lấy "${reward.name}"?`)) return;

    setRedeeming(reward.id);
    try {
      const result = await dispatch(redeemReward(reward.id)).unwrap();
      toast.success(result.message || 'Đổi phần thưởng thành công!');
      dispatch(fetchMyPoints());
      dispatch(fetchAvailableRewards());
    } catch (error) {
      toast.error(error || 'Lỗi khi đổi phần thưởng');
    } finally {
      setRedeeming(null);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      bronze: 'from-amber-700 to-amber-800',
      silver: 'from-gray-400 to-gray-500',
      gold: 'from-yellow-500 to-yellow-600',
      platinum: 'from-slate-400 to-slate-500',
      diamond: 'from-cyan-400 to-blue-500',
    };
    return colors[tier] || colors.bronze;
  };

  const getTierName = (tier) => {
    const names = {
      bronze: 'Đồng',
      silver: 'Bạc',
      gold: 'Vàng',
      platinum: 'Bạch Kim',
      diamond: 'Kim Cương',
    };
    return names[tier] || 'Đồng';
  };

  const getTransactionIcon = (type) => {
    if (type.includes('earn')) return <FaCoins className="text-green-500" />;
    if (type.includes('redeem')) return <FaGift className="text-blue-500" />;
    if (type.includes('expired')) return <FaClock className="text-red-500" />;
    return <FaCoins className="text-gray-500" />;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <FaCoins className="text-3xl text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold">Điểm tích lũy</h1>
            <p className="text-gray-500">Đổi điểm lấy ưu đãi hấp dẫn</p>
          </div>
        </div>

        {loading && !points ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Points Balance Card */}
            <div className={`bg-gradient-to-br ${getTierColor(points?.tier || 'bronze')} text-white rounded-2xl p-6 mb-8 shadow-lg`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FaCrown className="text-yellow-300" />
                    <span className="text-sm opacity-80">Hạng {getTierName(points?.tier)}</span>
                  </div>
                  <div className="text-5xl font-bold mb-1">{points?.currentBalance?.toLocaleString() || 0}</div>
                  <p className="opacity-80">Điểm hiện có</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{points?.lifetimeEarned?.toLocaleString() || 0}</div>
                  <p className="text-sm opacity-80">Tổng điểm kiếm được</p>
                  <div className="mt-2 text-sm">
                    Đã đổi: {points?.lifetimeRedeemed?.toLocaleString() || 0} điểm
                  </div>
                </div>
              </div>

              {/* Progress to next tier */}
              {points?.pointsToNextTier !== null && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Cần thêm {points?.pointsToNextTier?.toLocaleString() || 0} điểm để lên {getTierName(points?.nextTierAt)}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white rounded-full h-2 transition-all"
                      style={{
                        width: `${Math.min(100, ((points?.lifetimeEarned || 0) / (points?.pointsToNextTier + (points?.lifetimeEarned || 0) || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b">
              {[
                { key: 'points', label: 'Điểm của tôi', icon: FaStar },
                { key: 'rewards', label: 'Đổi thưởng', icon: FaGift },
                { key: 'history', label: 'Lịch sử', icon: FaHistory },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="text-sm" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'points' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="font-bold text-lg mb-4">Cách kiếm điểm</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <FaCoins className="text-2xl text-green-500 mt-1" />
                    <div>
                      <h3 className="font-medium">Mua hàng</h3>
                      <p className="text-sm text-gray-600">10 điểm / 1,000đ mua hàng</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <FaStar className="text-2xl text-blue-500 mt-1" />
                    <div>
                      <h3 className="font-medium">Đánh giá sản phẩm</h3>
                      <p className="text-sm text-gray-600">50 điểm + 1 mã 10% khi mua hàng thành công</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className={`bg-white rounded-lg shadow-sm p-4 ${
                      !reward.canRedeem ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FaGift className="text-2xl text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold">{reward.name}</h3>
                        <p className="text-sm text-gray-500">{reward.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-500 font-medium">
                        {reward.pointsCost.toLocaleString()} điểm
                      </span>
                      <button
                        onClick={() => handleRedeem(reward)}
                        disabled={!reward.canRedeem || redeeming === reward.id}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          reward.canRedeem
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {redeeming === reward.id ? 'Đang đổi...' : 'Đổi ngay'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white rounded-lg shadow-sm">
                {history.length > 0 ? (
                  <div className="divide-y">
                    {history.map((item, index) => (
                      <div key={item._id || index} className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          {getTransactionIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.description || 'Giao dịch điểm'}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className={`font-bold ${item.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.points >= 0 ? '+' : ''}{item.points.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FaHistory className="text-5xl mx-auto mb-4 text-gray-300" />
                    <p>Chưa có lịch sử giao dịch</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
