import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Tag, List, Avatar, Button, Space, Modal, Form, Input,
  Rate, Select, DatePicker, Upload, Switch, Row, Col, Empty, message,
  Descriptions, Divider, Image, App, Timeline, Steps, Progress,
  Popconfirm, Alert, InputNumber,
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, StarOutlined,
  CameraOutlined, ExclamationCircleOutlined, EditOutlined,
  SyncOutlined, ClockCircleOutlined, SolutionOutlined,
  WarningOutlined, CloseCircleOutlined, MessageOutlined,
  CarryOutOutlined, FileTextOutlined, SwapOutlined,
  MinusCircleOutlined, PayCircleOutlined, DollarOutlined,
  BankOutlined, RollbackOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { orderApi, dailyRecordApi, reviewApi, orderChangeApi, disputeApi, handoverApi, refundApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Order, DailyRecord, Review, OrderChange as OrderChangeType, Dispute, DisputeMessage, Handover, HandoverItem, HandoverDiscrepancy, Escrow, RefundRequest, EscrowInfo } from '../types';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;
const { RangePicker } = DatePicker;

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待确认' },
  active: { color: 'green', label: '进行中' },
  completed: { color: 'gray', label: '已完成' },
  cancelled: { color: 'red', label: '已取消' },
  disputed: { color: 'red', label: '有争议' },
};

const changeTypeMap: Record<string, { color: string; label: string }> = {
  reschedule: { color: 'blue', label: '改期' },
  services: { color: 'purple', label: '加减服务项' },
  transport: { color: 'cyan', label: '修改接送方式' },
  price: { color: 'orange', label: '补差价/退款' },
};

const changeStatusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待确认' },
  approved: { color: 'green', label: '已确认' },
  rejected: { color: 'red', label: '已拒绝' },
  cancelled: { color: 'default', label: '已取消' },
};

const disputeStatusMap: Record<string, { color: string; label: string }> = {
  open: { color: 'red', label: '协商中' },
  resolved: { color: 'green', label: '已解决' },
  closed: { color: 'gray', label: '已关闭' },
};

const triggerTypeMap: Record<string, { color: string; label: string }> = {
  abnormal_behavior: { color: 'red', label: '连续异常行为' },
  feeding_missing: { color: 'orange', label: '连续喂养缺失' },
  photo_missing: { color: 'yellow', label: '连续照片缺失' },
  manual: { color: 'blue', label: '用户发起' },
};

const handoverStatusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending_owner_confirm: { color: 'orange', label: '待主人确认' },
  pending_caregiver_confirm: { color: 'blue', label: '待代养人确认' },
  confirmed: { color: 'green', label: '已确认' },
  disputed: { color: 'red', label: '有争议' },
};

const handoverStageMap: Record<string, { color: string; label: string }> = {
  start: { color: 'green', label: '开始服务交接' },
  end: { color: 'orange', label: '结束服务交接' },
};

const escrowStatusMap: Record<string, { color: string; label: string }> = {
  unpaid: { color: 'default', label: '待支付' },
  held: { color: 'blue', label: '托管中' },
  settled: { color: 'green', label: '已结算' },
  refunded: { color: 'red', label: '已退款' },
  partially_refunded: { color: 'orange', label: '部分退款' },
};

const refundStatusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待处理' },
  approved: { color: 'green', label: '已同意' },
  rejected: { color: 'red', label: '已拒绝' },
  cancelled: { color: 'default', label: '已取消' },
};

const transportOptions = [
  { value: 'caregiver_pickup', label: '代养人上门接' },
  { value: 'owner_deliver', label: '主人送上门' },
  { value: 'meetup', label: '约定地点交接' },
];

const serviceOptions = ['遛狗', '陪玩', '拍照', '喂药', '洗澡', '梳毛', '遛弯', '陪夜'];

const moodOptions = ['活泼', '正常', '安静', '开心', '懒散', '焦虑'];

const Orders: React.FC = () => {
  const { user } = useAuth();
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [recordModal, setRecordModal] = useState(false);
  const [recordForm] = Form.useForm();
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  const [detailModal, setDetailModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [orderReviews, setOrderReviews] = useState<Review[]>([]);
  const [orderChanges, setOrderChanges] = useState<OrderChangeType[]>([]);
  const [orderDisputes, setOrderDisputes] = useState<Dispute[]>([]);

  const [reviewModal, setReviewModal] = useState(false);
  const [reviewForm] = Form.useForm();
  const [reviewRole, setReviewRole] = useState<'owner' | 'caregiver'>('owner');

  const [changeModal, setChangeModal] = useState(false);
  const [changeForm] = Form.useForm();
  const [changeType, setChangeType] = useState<'reschedule' | 'services' | 'transport' | 'price'>('reschedule');

  const [disputeModal, setDisputeModal] = useState(false);
  const [disputeForm] = Form.useForm();
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
  const [disputeMsgForm] = Form.useForm();

  const [orderHandovers, setOrderHandovers] = useState<Handover[]>([]);
  const [handoverModal, setHandoverModal] = useState(false);
  const [handoverForm] = Form.useForm();
  const [editingHandover, setEditingHandover] = useState<Handover | null>(null);
  const [handoverItems, setHandoverItems] = useState<HandoverItem[]>([]);
  const [handoverPhotos, setHandoverPhotos] = useState<string[]>([]);

  const [caregiverConfirmModal, setCaregiverConfirmModal] = useState(false);
  const [caregiverConfirmForm] = Form.useForm();
  const [confirmingHandover, setConfirmingHandover] = useState<Handover | null>(null);
  const [actualItems, setActualItems] = useState<HandoverItem[]>([]);
  const [discrepancies, setDiscrepancies] = useState<HandoverDiscrepancy[]>([]);

  const [orderRefunds, setOrderRefunds] = useState<RefundRequest[]>([]);
  const [refundModal, setRefundModal] = useState(false);
  const [refundForm] = Form.useForm();

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      const res = await orderApi.list(params);
      const allOrders = Array.isArray(res.data) ? res.data : (res.data as any).results || [];
      const myOrders = allOrders.filter(
        (o: Order) => o.owner === user?.id || o.caregiver === user?.id
      );
      setOrders(myOrders);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (order: Order) => {
    setDetailOrder(order);
    setDetailModal(true);
    try {
      const [r, rv, ch, dp, hd, rf] = await Promise.all([
        dailyRecordApi.list({ order: order.id }),
        reviewApi.list({ order: order.id }),
        orderChangeApi.list({ order: order.id }),
        disputeApi.list({ order: order.id }),
        handoverApi.list({ order: order.id }),
        refundApi.list({ order: order.id }),
      ]);
      setDailyRecords(Array.isArray(r.data) ? r.data : (r.data as any).results || []);
      setOrderReviews(Array.isArray(rv.data) ? rv.data : (rv.data as any).results || []);
      setOrderChanges(Array.isArray(ch.data) ? ch.data : (ch.data as any).results || []);
      const disputes = Array.isArray(dp.data) ? dp.data : (dp.data as any).results || [];
      setOrderDisputes(disputes);
      setOrderHandovers(Array.isArray(hd.data) ? hd.data : (hd.data as any).results || []);
      setOrderRefunds(Array.isArray(rf.data) ? rf.data : (rf.data as any).results || []);
      if (disputes.length > 0) {
        const openDispute = disputes.find((d: Dispute) => d.status === 'open');
        if (openDispute) {
          const detail = await disputeApi.get(openDispute.id);
          setActiveDispute(detail.data);
        }
      }
    } catch {}
  };

  const openRecord = (order: Order) => {
    setCurrentOrder(order);
    recordForm.resetFields();
    recordForm.setFieldsValue({
      record_date: dayjs(),
      abnormal_behavior: false,
    });
    setRecordModal(true);
  };

  const submitRecord = async () => {
    try {
      const values = await recordForm.validateFields();
      await dailyRecordApi.create({
        ...values,
        record_date: values.record_date.format('YYYY-MM-DD'),
        order: currentOrder?.id,
        caregiver: user?.id,
        photos: [],
      });
      message.success('每日记录提交成功');
      setRecordModal(false);
      if (detailOrder?.id === currentOrder?.id) {
        openDetail(currentOrder!);
      }
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '提交失败');
    }
  };

  const handleStart = async (order: Order) => {
    await orderApi.start(order.id);
    message.success('订单已开始');
    loadOrders();
  };

  const handleComplete = async (order: Order) => {
    modal.confirm({
      title: '确认完成此订单？',
      content: '订单完成后双方将可以进行评价。',
      onOk: async () => {
        try {
          await orderApi.complete(order.id);
          message.success('订单已完成');
          loadOrders();
        } catch (e: any) {
          message.error(e?.response?.data?.error || '操作失败');
        }
      },
    });
  };

  const openReview = (order: Order, role: 'owner' | 'caregiver') => {
    setCurrentOrder(order);
    setReviewRole(role);
    reviewForm.resetFields();
    reviewForm.setFieldsValue({ rating: 5 });
    setReviewModal(true);
  };

  const submitReview = async () => {
    try {
      const values = await reviewForm.validateFields();
      const isOwner = reviewRole === 'owner';
      await reviewApi.create({
        ...values,
        order: currentOrder?.id,
        reviewer: user?.id,
        reviewee: isOwner ? currentOrder?.caregiver : currentOrder?.owner,
        role: reviewRole,
        tags: values.tags || [],
      });
      message.success('评价提交成功');
      setReviewModal(false);
      if (detailOrder?.id === currentOrder?.id) {
        openDetail(currentOrder!);
      }
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '提交失败');
    }
  };

  const openChangeModal = (order: Order) => {
    setCurrentOrder(order);
    setChangeType('reschedule');
    changeForm.resetFields();
    changeForm.setFieldsValue({
      change_type: 'reschedule',
      new_services: order.services || [],
      new_transport: order.transport,
    });
    setChangeModal(true);
  };

  const submitChange = async () => {
    try {
      const values = await changeForm.validateFields();
      const data: any = {
        order: currentOrder?.id,
        change_type: values.change_type,
        reason: values.reason,
      };
      if (values.change_type === 'reschedule') {
        data.new_start_date = values.date_range[0].format('YYYY-MM-DD');
        data.new_end_date = values.date_range[1].format('YYYY-MM-DD');
      } else if (values.change_type === 'services') {
        data.new_services = values.new_services || [];
      } else if (values.change_type === 'transport') {
        data.new_transport = values.new_transport;
      } else if (values.change_type === 'price') {
        data.new_price = values.new_price;
        data.price_diff = values.price_diff;
      }
      await orderChangeApi.create(data);
      message.success('变更申请已提交，等待对方确认');
      setChangeModal(false);
      if (detailOrder?.id === currentOrder?.id) {
        openDetail(currentOrder!);
      }
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '提交失败');
    }
  };

  const handleApproveChange = async (change: OrderChangeType) => {
    try {
      await orderChangeApi.approve(change.id);
      message.success('变更已确认，订单信息已更新');
      if (detailOrder) {
        openDetail(detailOrder);
      }
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '操作失败');
    }
  };

  const handleRejectChange = async (change: OrderChangeType) => {
    modal.confirm({
      title: '拒绝变更申请',
      content: (
        <div>
          <Input.TextArea
            id="reject_reason_input"
            rows={3}
            placeholder="请输入拒绝原因"
            maxLength={200}
          />
        </div>
      ),
      onOk: async () => {
        try {
          const input = document.getElementById('reject_reason_input') as HTMLTextAreaElement;
          const reason = input?.value || '';
          await orderChangeApi.reject(change.id, reason);
          message.success('已拒绝变更申请');
          if (detailOrder) {
            openDetail(detailOrder);
          }
          loadOrders();
        } catch (e: any) {
          message.error(e?.response?.data?.error || '操作失败');
        }
      },
    });
  };

  const handleCancelChange = async (change: OrderChangeType) => {
    try {
      await orderChangeApi.cancel(change.id);
      message.success('已取消变更申请');
      if (detailOrder) {
        openDetail(detailOrder);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.error || '操作失败');
    }
  };

  const openDisputeModal = (order: Order) => {
    setCurrentOrder(order);
    disputeForm.resetFields();
    setDisputeModal(true);
  };

  const submitDispute = async () => {
    try {
      const values = await disputeForm.validateFields();
      await disputeApi.create({
        order: currentOrder?.id,
        title: values.title,
        description: values.description,
        trigger_type: 'manual',
      });
      message.success('争议已发起，请等待协商');
      setDisputeModal(false);
      if (detailOrder?.id === currentOrder?.id) {
        openDetail(currentOrder!);
      }
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '提交失败');
    }
  };

  const handleSendDisputeMsg = async () => {
    if (!activeDispute) return;
    try {
      const values = await disputeMsgForm.validateFields();
      await disputeApi.addMessage(activeDispute.id, values.content);
      const detail = await disputeApi.get(activeDispute.id);
      setActiveDispute(detail.data);
      disputeMsgForm.resetFields();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '发送失败');
    }
  };

  const handleResolveDispute = async () => {
    if (!activeDispute) return;
    modal.confirm({
      title: '解决争议',
      content: (
        <div>
          <Input.TextArea
            id="resolution_input"
            rows={3}
            placeholder="请输入解决方案"
            maxLength={500}
          />
        </div>
      ),
      onOk: async () => {
        try {
          const input = document.getElementById('resolution_input') as HTMLTextAreaElement;
          const resolution = input?.value || '';
          await disputeApi.resolve(activeDispute.id, resolution);
          message.success('争议已解决');
          const detail = await disputeApi.get(activeDispute.id);
          setActiveDispute(detail.data);
          if (detailOrder) {
            openDetail(detailOrder);
          }
          loadOrders();
        } catch (e: any) {
          message.error(e?.response?.data?.error || '操作失败');
        }
      },
    });
  };

  const handleCloseDispute = async () => {
    if (!activeDispute) return;
    try {
      await disputeApi.close(activeDispute.id);
      message.success('争议已关闭');
      const detail = await disputeApi.get(activeDispute.id);
      setActiveDispute(detail.data);
      if (detailOrder) {
        openDetail(detailOrder);
      }
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '操作失败');
    }
  };

  const getOrderStep = (order: Order) => {
    switch (order.status) {
      case 'pending': return 0;
      case 'active': return 1;
      case 'disputed': return 1;
      case 'completed': return 2;
      default: return 0;
    }
  };

  const totalDays = (order: Order) => {
    return dayjs(order.end_date).diff(dayjs(order.start_date), 'day') + 1;
  };

  const isOrderInvolved = (o: Order) => o.owner === user?.id || o.caregiver === user?.id;

  const openCreateHandover = (order: Order) => {
    setCurrentOrder(order);
    setEditingHandover(null);
    setHandoverItems([]);
    setHandoverPhotos([]);
    handoverForm.resetFields();
    handoverForm.setFieldsValue({
      stage: 'start',
      feeding_instructions: '',
      health_notes: '',
      location: '',
    });
    setHandoverModal(true);
  };

  const openEditHandover = (handover: Handover) => {
    setEditingHandover(handover);
    setHandoverItems(handover.items || []);
    setHandoverPhotos(handover.photos || []);
    handoverForm.resetFields();
    handoverForm.setFieldsValue({
      stage: handover.stage,
      feeding_instructions: handover.feeding_instructions,
      health_notes: handover.health_notes,
      location: handover.location,
      expected_time: handover.expected_time ? dayjs(handover.expected_time) : undefined,
    });
    setHandoverModal(true);
  };

  const addHandoverItem = () => {
    setHandoverItems([...handoverItems, { name: '', quantity: '' }]);
  };

  const removeHandoverItem = (idx: number) => {
    setHandoverItems(handoverItems.filter((_, i) => i !== idx));
  };

  const updateHandoverItem = (idx: number, field: 'name' | 'quantity', value: string) => {
    const newItems = [...handoverItems];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setHandoverItems(newItems);
  };

  const addPhotoUrl = () => {
    setHandoverPhotos([...handoverPhotos, '']);
  };

  const removePhotoUrl = (idx: number) => {
    setHandoverPhotos(handoverPhotos.filter((_, i) => i !== idx));
  };

  const updatePhotoUrl = (idx: number, value: string) => {
    const newPhotos = [...handoverPhotos];
    newPhotos[idx] = value;
    setHandoverPhotos(newPhotos);
  };

  const saveHandover = async (submitForConfirm = false) => {
    try {
      const values = await handoverForm.validateFields();
      const data: any = {
        order: currentOrder?.id,
        stage: values.stage,
        items: handoverItems.filter(i => i.name.trim()),
        feeding_instructions: values.feeding_instructions || '',
        health_notes: values.health_notes || '',
        location: values.location || '',
        photos: handoverPhotos.filter(p => p.trim()),
        expected_time: values.expected_time ? values.expected_time.format('YYYY-MM-DD HH:mm:ss') : null,
      };

      let handover: Handover;
      if (editingHandover) {
        const res = await handoverApi.update(editingHandover.id, data);
        handover = res.data;
      } else {
        const res = await handoverApi.create(data);
        handover = res.data;
      }

      if (submitForConfirm) {
        const submitRes = await handoverApi.submit(handover.id);
        handover = submitRes.data.handover;
        message.success('交接清单已提交，等待代养人确认');
      } else {
        message.success('交接清单已保存');
      }

      setHandoverModal(false);
      if (detailOrder) {
        openDetail(detailOrder);
      }
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '保存失败');
    }
  };

  const openCaregiverConfirm = (handover: Handover) => {
    setConfirmingHandover(handover);
    setActualItems(handover.items || []);
    setDiscrepancies([]);
    caregiverConfirmForm.resetFields();
    caregiverConfirmForm.setFieldsValue({
      actual_notes: '',
      has_discrepancies: false,
    });
    setCaregiverConfirmModal(true);
  };

  const addActualItem = () => {
    setActualItems([...actualItems, { name: '', quantity: '' }]);
  };

  const removeActualItem = (idx: number) => {
    setActualItems(actualItems.filter((_, i) => i !== idx));
  };

  const updateActualItem = (idx: number, field: 'name' | 'quantity', value: string) => {
    const newItems = [...actualItems];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setActualItems(newItems);
  };

  const addDiscrepancy = () => {
    setDiscrepancies([...discrepancies, { field: '', description: '' }]);
  };

  const removeDiscrepancy = (idx: number) => {
    setDiscrepancies(discrepancies.filter((_, i) => i !== idx));
  };

  const updateDiscrepancy = (idx: number, field: 'field' | 'description', value: string) => {
    const newDisc = [...discrepancies];
    newDisc[idx] = { ...newDisc[idx], [field]: value };
    setDiscrepancies(newDisc);
  };

  const submitCaregiverConfirm = async () => {
    if (!confirmingHandover) return;
    try {
      const values = await caregiverConfirmForm.validateFields();
      const res = await handoverApi.caregiverConfirm(confirmingHandover.id, {
        actual_items: actualItems.filter(i => i.name.trim()),
        actual_notes: values.actual_notes || '',
        discrepancies: discrepancies.filter(d => d.field.trim() || d.description.trim()),
        has_discrepancies: values.has_discrepancies || discrepancies.length > 0,
      });
      if (res.data.dispute_created) {
        message.warning('已标记差异，系统已自动创建争议，请协商解决');
      } else {
        message.success('交接已确认，等待主人最终确认');
      }
      setCaregiverConfirmModal(false);
      if (detailOrder) {
        openDetail(detailOrder);
      }
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '确认失败');
    }
  };

  const handleOwnerFinalConfirm = async (handover: Handover) => {
    modal.confirm({
      title: '最终确认交接',
      content: '确认后交接清单将不可编辑，订单将可以开始服务。',
      onOk: async () => {
        try {
          await handoverApi.ownerFinalConfirm(handover.id);
          message.success('交接已完成确认');
          if (detailOrder) {
            openDetail(detailOrder);
          }
          loadOrders();
        } catch (e: any) {
          message.error(e?.response?.data?.error || '确认失败');
        }
      },
    });
  };

  const handlePayEscrow = async (order: Order) => {
    modal.confirm({
      title: '确认支付托管金额',
      content: (
        <div>
          <p>即将支付托管金额：<strong style={{ color: '#52c41a' }}>¥{order.total_price}</strong></p>
          <p style={{ color: '#6b7280', fontSize: 12 }}>
            包含：平台服务费 10%，剩余部分将在服务完成并评价后结算给代养人。
          </p>
        </div>
      ),
      onOk: async () => {
        try {
          await orderApi.payEscrow(order.id);
          message.success('托管支付成功');
          if (detailOrder?.id === order.id) {
            openDetail(order);
          }
          loadOrders();
        } catch (e: any) {
          message.error(e?.response?.data?.error || '支付失败');
        }
      },
    });
  };

  const handleSettle = async (order: Order) => {
    try {
      const res = await orderApi.settle(order.id);
      if (res.data.success) {
        message.success('结算成功');
        if (detailOrder?.id === order.id) {
          openDetail(order);
        }
        loadOrders();
      }
    } catch (e: any) {
      const blocked = e?.response?.data?.blocked_reasons;
      if (blocked && blocked.length > 0) {
        message.error('无法结算：' + blocked.join('；'));
      } else {
        message.error(e?.response?.data?.error || '结算失败');
      }
    }
  };

  const openRefundModal = (order: Order) => {
    setCurrentOrder(order);
    refundForm.resetFields();
    refundForm.setFieldsValue({ amount: 0 });
    setRefundModal(true);
  };

  const submitRefund = async () => {
    try {
      const values = await refundForm.validateFields();
      await refundApi.create({
        order: currentOrder!.id,
        amount: values.amount,
        reason: values.reason,
      });
      message.success('退款申请已提交，等待代养人确认');
      setRefundModal(false);
      if (detailOrder?.id === currentOrder?.id) {
        openDetail(currentOrder!);
      }
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '提交失败');
    }
  };

  const handleApproveRefund = async (refund: RefundRequest) => {
    modal.confirm({
      title: '确认同意退款',
      content: (
        <div>
          <p>退款金额：<strong style={{ color: '#ef4444' }}>¥{refund.amount}</strong></p>
          <p>退款原因：{refund.reason}</p>
        </div>
      ),
      onOk: async () => {
        try {
          await refundApi.approve(refund.id);
          message.success('已同意退款');
          if (detailOrder) {
            openDetail(detailOrder);
          }
          loadOrders();
        } catch (e: any) {
          message.error(e?.response?.data?.error || '操作失败');
        }
      },
    });
  };

  const handleRejectRefund = async (refund: RefundRequest) => {
    modal.confirm({
      title: '拒绝退款申请',
      content: (
        <div>
          <Input.TextArea
            id="reject_refund_reason"
            rows={3}
            placeholder="请输入拒绝原因"
            maxLength={200}
          />
        </div>
      ),
      onOk: async () => {
        try {
          const input = document.getElementById('reject_refund_reason') as HTMLTextAreaElement;
          const reason = input?.value || '';
          await refundApi.reject(refund.id, reason);
          message.success('已拒绝退款申请');
          if (detailOrder) {
            openDetail(detailOrder);
          }
          loadOrders();
        } catch (e: any) {
          message.error(e?.response?.data?.error || '操作失败');
        }
      },
    });
  };

  const handleCancelRefund = async (refund: RefundRequest) => {
    try {
      await refundApi.cancel(refund.id);
      message.success('已取消退款申请');
      if (detailOrder) {
        openDetail(detailOrder);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.error || '操作失败');
    }
  };

  const getStartHandover = () => {
    return orderHandovers.find(h => h.stage === 'start');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">📦 订单跟踪与变更协商</div>
        <Button type="primary" onClick={() => navigate('/requests/new')}>
          + 发布寄养需求
        </Button>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="全部订单" key="all" />
          <TabPane tab="待确认" key="pending" />
          <TabPane tab="进行中" key="active" />
          <TabPane tab="有争议" key="disputed" />
          <TabPane tab="已完成" key="completed" />
        </Tabs>
      </Card>

      {orders.length === 0 ? (
        <Empty description="暂无订单，快去发布寄养需求吧~" />
      ) : (
        <List
          loading={loading}
          dataSource={orders}
          renderItem={(order) => {
            const st = statusMap[order.status];
            const isOwner = order.owner === user?.id;
            const days = totalDays(order);
            const progress = Math.min(100, Math.round(dailyRecords.filter(r => r.order === order.id).length / days * 100));
            const pendingChanges = orderChanges.filter(c => c.order === order.id && c.status === 'pending');
            const escrowInfo = order.escrow_info;
            const escrowSt = escrowInfo ? escrowStatusMap[escrowInfo.status] : null;
            const settlementBlocked = order.settlement_blocked_reasons && order.settlement_blocked_reasons.length > 0;
            return (
              <Card
                style={{ marginBottom: 16, borderRadius: 12 }}
                bodyStyle={{ padding: 20 }}
              >
                {order.status === 'disputed' && (
                  <Alert
                    message="⚠️ 该订单存在争议，正在协商中"
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
                {pendingChanges.length > 0 && (
                  <Alert
                    message={`📝 有 ${pendingChanges.length} 个变更申请待处理`}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
                {settlementBlocked && (
                  <Alert
                    message={<div>
                      <strong>⛔ 暂无法结算：</strong>
                      <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                        {order.settlement_blocked_reasons!.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
                <Row gutter={16} align="middle">
                  <Col xs={24} md={8}>
                    <Space style={{ marginBottom: 12 }} wrap>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>订单 #{order.id}</span>
                      <Tag color={st.color} style={{ fontSize: 13 }}>{st.label}</Tag>
                      {escrowSt && (
                        <Tag icon={<BankOutlined />} color={escrowSt.color} style={{ fontSize: 13 }}>
                          {escrowSt.label}
                        </Tag>
                      )}
                    </Space>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                        🐾 宠物：{order.foster_request_info?.pet_info?.name} ({order.foster_request_info?.pet_info?.breed})
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                        {isOwner ? '🏠 代养人：' : '👤 宠物主人：'}
                        {isOwner ? order.caregiver_name : order.owner_name}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        📅 {dayjs(order.start_date).format('MM-DD')} ~ {dayjs(order.end_date).format('MM-DD')} （{days}天）
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={10}>
                    <Steps
                      size="small"
                      current={getOrderStep(order)}
                      style={{ marginBottom: 12 }}
                    >
                      <Step title="已确认" />
                      <Step title="服务中" />
                      <Step title="已完成" />
                    </Steps>
                    {order.status === 'active' && (
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                          服务进度：已记录 {dailyRecords.filter(r => r.order === order.id).length}/{days} 天
                        </div>
                        <Progress percent={progress} size="small" strokeColor="#52c41a" />
                      </div>
                    )}
                    {order.status === 'completed' && (
                      <Space wrap>
                        <Tag color={order.owner_reviewed ? 'green' : 'default'}>
                          {order.owner_reviewed ? '✓ 主人已评价' : '主人待评价'}
                        </Tag>
                        <Tag color={order.caregiver_reviewed ? 'green' : 'default'}>
                          {order.caregiver_reviewed ? '✓ 代养人已评价' : '代养人待评价'}
                        </Tag>
                      </Space>
                    )}
                  </Col>
                  <Col xs={24} md={6} style={{ textAlign: 'right' }}>
                    <div style={{ color: '#52c41a', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
                      ¥{order.total_price}
                    </div>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Button type="primary" block onClick={() => openDetail(order)}>
                        查看详情
                      </Button>
                      {order.status === 'pending' && isOwner && escrowInfo?.status === 'unpaid' && (
                        <Button block type="primary" icon={<PayCircleOutlined />} style={{ background: '#faad14', borderColor: '#faad14' }} onClick={() => handlePayEscrow(order)}>
                          支付托管金额
                        </Button>
                      )}
                      {(order.status === 'pending' || order.status === 'active') && isOwner && (
                        <Button block icon={<FileTextOutlined />} onClick={() => openCreateHandover(order)}>
                          {order.latest_start_handover ? '编辑交接清单' : '发起交接清单'}
                        </Button>
                      )}
                      {order.status === 'pending' && (
                        <Button block onClick={() => handleStart(order)}>
                          开始服务
                        </Button>
                      )}
                      {(order.status === 'pending' || order.status === 'active') && !order.has_open_dispute && (
                        <Button block icon={<EditOutlined />} onClick={() => openChangeModal(order)}>
                          申请变更
                        </Button>
                      )}
                      {order.status === 'active' && !order.has_open_dispute && !isOwner && (
                        <Button block icon={<PlusOutlined />} onClick={() => openRecord(order)}>
                          登记今日情况
                        </Button>
                      )}
                      {escrowInfo?.status === 'held' && isOwner && order.status !== 'cancelled' && (
                        <Button block icon={<RollbackOutlined />} onClick={() => openRefundModal(order)}>
                          申请退款
                        </Button>
                      )}
                      {(order.status === 'pending' || order.status === 'active') && (
                        <Button block icon={<WarningOutlined />} danger onClick={() => openDisputeModal(order)}>
                          发起争议
                        </Button>
                      )}
                      {order.status === 'active' && !order.has_open_dispute && (
                        <Button block type="default" onClick={() => handleComplete(order)}>
                          完成订单
                        </Button>
                      )}
                      {order.can_settle && (
                        <Button block type="primary" icon={<DollarOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => handleSettle(order)}>
                          结算托管金额
                        </Button>
                      )}
                      {order.status === 'completed' && isOwner && !order.owner_reviewed && (
                        <Button block type="primary" icon={<StarOutlined />} onClick={() => openReview(order, 'owner')}>
                          评价代养人
                        </Button>
                      )}
                      {order.status === 'completed' && !isOwner && !order.caregiver_reviewed && (
                        <Button block type="primary" icon={<StarOutlined />} onClick={() => openReview(order, 'caregiver')}>
                          评价主人
                        </Button>
                      )}
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          }}
        />
      )}

      {/* 登记记录 Modal */}
      <Modal
        title="📝 登记今日喂养情况"
        open={recordModal}
        onOk={submitRecord}
        onCancel={() => setRecordModal(false)}
        okText="提交记录"
        cancelText="取消"
        width={600}
      >
        <Form form={recordForm} layout="vertical">
          <Form.Item name="record_date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} disabledDate={(d) => d && d.isAfter(dayjs())} />
          </Form.Item>
          <Form.Item name="feeding_info" label="喂养情况" rules={[{ required: true, message: '请填写喂养情况' }]}>
            <TextArea rows={2} placeholder="喂食时间、食物种类、食欲情况等" />
          </Form.Item>
          <Form.Item name="pet_status" label="宠物状态" rules={[{ required: true, message: '请填写宠物状态' }]}>
            <TextArea rows={2} placeholder="精神状态、活动情况、健康状况等" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="mood" label="宠物心情">
                <Select placeholder="选择心情">
                  {moodOptions.map(m => <Option key={m} value={m}>{m}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="abnormal_behavior" label="异常行为" valuePropName="checked">
                <Switch checkedChildren="有" unCheckedChildren="无" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item noStyle shouldUpdate={(p, c) => p.abnormal_behavior !== c.abnormal_behavior}>
            {({ getFieldValue }) =>
              getFieldValue('abnormal_behavior') ? (
                <Form.Item name="abnormal_description" label="异常行为描述" rules={[{ required: true }]}>
                  <TextArea rows={2} placeholder="请描述具体异常情况" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item label="状态照片">
            <Upload
              listType="picture-card"
              multiple
              beforeUpload={() => false}
            >
              <div>
                <CameraOutlined />
                <div style={{ marginTop: 8 }}>上传照片</div>
              </div>
            </Upload>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="其他需要说明的情况" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 评价 Modal */}
      <Modal
        title={reviewRole === 'owner' ? '⭐ 评价代养人' : '⭐ 评价宠物主人'}
        open={reviewModal}
        onOk={submitReview}
        onCancel={() => setReviewModal(false)}
        okText="提交评价"
        cancelText="取消"
        width={520}
      >
        <Form form={reviewForm} layout="vertical">
          <Form.Item
            name="rating"
            label="综合评分"
            rules={[{ required: true, message: '请评分' }]}
          >
            <Rate style={{ fontSize: 32 }} />
          </Form.Item>
          <Form.Item
            name="content"
            label="评价内容"
            rules={[{ required: true, message: '请填写评价内容' }]}
          >
            <TextArea rows={4} placeholder="分享您的真实体验，帮助其他用户做出选择..." />
          </Form.Item>
          <Form.Item name="tags" label="评价标签">
            <Select
              mode="tags"
              placeholder="选择或添加标签"
              style={{ width: '100%' }}
              options={[
                { value: '负责', label: '负责' },
                { value: '有爱心', label: '有爱心' },
                { value: '准时', label: '准时' },
                { value: '专业', label: '专业' },
                { value: '沟通好', label: '沟通好' },
                { value: '干净', label: '干净' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 变更申请 Modal */}
      <Modal
        title="📝 申请订单变更"
        open={changeModal}
        onOk={submitChange}
        onCancel={() => setChangeModal(false)}
        okText="提交申请"
        cancelText="取消"
        width={560}
      >
        <Form form={changeForm} layout="vertical">
          <Form.Item name="change_type" label="变更类型" rules={[{ required: true }]}>
            <Select onChange={(v) => setChangeType(v)}>
              <Option value="reschedule">改期</Option>
              <Option value="services">加减服务项</Option>
              <Option value="transport">修改接送方式</Option>
              <Option value="price">补差价/退款</Option>
            </Select>
          </Form.Item>

          {changeType === 'reschedule' && (
            <Form.Item name="date_range" label="新的服务周期" rules={[{ required: true, message: '请选择日期范围' }]}>
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          )}

          {changeType === 'services' && (
            <Form.Item name="new_services" label="服务项目" rules={[{ required: true }]}>
              <Select
                mode="multiple"
                placeholder="选择服务项目"
                style={{ width: '100%' }}
              >
                {serviceOptions.map(s => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </Form.Item>
          )}

          {changeType === 'transport' && (
            <Form.Item name="new_transport" label="新的接送方式" rules={[{ required: true }]}>
              <Select>
                {transportOptions.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
              </Select>
            </Form.Item>
          )}

          {changeType === 'price' && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="new_price" label="新价格（元）" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="price_diff" label="差价（正补负退）" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} precision={2} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Form.Item name="reason" label="变更原因" rules={[{ required: true, message: '请填写变更原因' }]}>
            <TextArea rows={3} placeholder="请详细说明变更原因..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 发起争议 Modal */}
      <Modal
        title="⚠️ 发起争议协商"
        open={disputeModal}
        onOk={submitDispute}
        onCancel={() => setDisputeModal(false)}
        okText="发起争议"
        cancelText="取消"
        width={520}
      >
        <Alert
          message="争议未关闭前将禁止完成订单与互评"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={disputeForm} layout="vertical">
          <Form.Item name="title" label="争议标题" rules={[{ required: true, message: '请填写标题' }]}>
            <Input placeholder="简要描述争议问题" />
          </Form.Item>
          <Form.Item name="description" label="详细描述" rules={[{ required: true, message: '请填写详细描述' }]}>
            <TextArea rows={4} placeholder="请详细描述争议内容和希望的解决方案..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 订单详情 Modal */}
      <Modal
        title={`订单 #${detailOrder?.id} 详情 - 变更与协商中心`}
        open={detailModal}
        onCancel={() => { setDetailModal(false); setActiveDispute(null); }}
        footer={[<Button key="close" onClick={() => { setDetailModal(false); setActiveDispute(null); }}>关闭</Button>]}
        width={900}
      >
        {detailOrder && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="订单状态">
                <Tag color={statusMap[detailOrder.status].color}>
                  {statusMap[detailOrder.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <span style={{ color: '#52c41a', fontWeight: 600 }}>¥{detailOrder.total_price}</span>
              </Descriptions.Item>
              <Descriptions.Item label="宠物主人">{detailOrder.owner_name}</Descriptions.Item>
              <Descriptions.Item label="代养人">{detailOrder.caregiver_name}</Descriptions.Item>
              <Descriptions.Item label="开始日期">{detailOrder.start_date}</Descriptions.Item>
              <Descriptions.Item label="结束日期">{detailOrder.end_date}</Descriptions.Item>
              <Descriptions.Item label="接送方式">{detailOrder.transport_display || detailOrder.transport}</Descriptions.Item>
              <Descriptions.Item label="服务项目">
                {detailOrder.services?.length > 0
                  ? detailOrder.services.map((s: string) => <Tag key={s}>{s}</Tag>)
                  : '暂无'}
              </Descriptions.Item>
              {detailOrder.escrow_info && (
                <>
                  <Descriptions.Item label="托管状态">
                    <Tag icon={<BankOutlined />} color={escrowStatusMap[detailOrder.escrow_info.status].color}>
                      {escrowStatusMap[detailOrder.escrow_info.status].label}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="结算状态">
                    {detailOrder.can_settle ? (
                      <Tag color="green" icon={<CheckCircleOutlined />}>可结算</Tag>
                    ) : (
                      <Tag color="orange" icon={<WarningOutlined />}>暂不可结算</Tag>
                    )}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="宠物信息" span={2}>
                {detailOrder.foster_request_info?.pet_info?.name} -
                {detailOrder.foster_request_info?.pet_info?.breed}
              </Descriptions.Item>
              <Descriptions.Item label="需求描述" span={2}>
                {detailOrder.foster_request_info?.description}
              </Descriptions.Item>
              {detailOrder.settlement_blocked_reasons && detailOrder.settlement_blocked_reasons.length > 0 && (
                <Descriptions.Item label="⛔ 结算阻止原因" span={2}>
                  <div style={{ color: '#dc2626' }}>
                    {detailOrder.settlement_blocked_reasons.map((r, i) => (
                      <div key={i}>• {r}</div>
                    ))}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Tabs defaultActiveKey="records">
              <TabPane tab={<span><FileTextOutlined />交接清单</span>} key="handovers">
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    {(detailOrder.status === 'pending' || detailOrder.status === 'active') && detailOrder.owner === user?.id && (
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateHandover(detailOrder)}>
                        {getStartHandover() ? '编辑交接清单' : '发起交接清单'}
                      </Button>
                    )}
                  </Space>
                </div>
                {orderHandovers.length === 0 ? (
                  <Empty description="暂无交接记录" />
                ) : (
                  <List
                    dataSource={orderHandovers.sort((a, b) => dayjs(b.created_at).unix() - dayjs(a.created_at).unix())}
                    renderItem={(handover) => {
                      const hs = handoverStatusMap[handover.status];
                      const hst = handoverStageMap[handover.stage];
                      const isOwner = detailOrder.owner === user?.id;
                      const isCaregiver = detailOrder.caregiver === user?.id;
                      return (
                        <List.Item key={handover.id}>
                          <Card style={{ width: '100%', borderRadius: 8 }} bodyStyle={{ padding: 16 }}>
                            <Space style={{ marginBottom: 12 }} wrap>
                              <Tag color={hst.color} icon={<SwapOutlined />}>{hst.label}</Tag>
                              <Tag color={hs.color}>{hs.label}</Tag>
                              {handover.has_discrepancies && <Tag color="red" icon={<WarningOutlined />}>有差异/异常</Tag>}
                              <span style={{ color: '#6b7280', fontSize: 12 }}>
                                <ClockCircleOutlined /> 创建时间：{dayjs(handover.created_at).format('YYYY-MM-DD HH:mm')}
                              </span>
                              {handover.confirmed_at && (
                                <span style={{ color: '#52c41a', fontSize: 12 }}>
                                  <CheckCircleOutlined /> 确认时间：{dayjs(handover.confirmed_at).format('YYYY-MM-DD HH:mm')}
                                </span>
                              )}
                            </Space>

                            <Descriptions column={2} size="small" style={{ marginBottom: 12 }} bordered>
                              <Descriptions.Item label="接送地点" span={2}>
                                {handover.location || '未填写'}
                              </Descriptions.Item>
                              <Descriptions.Item label="预计交接时间" span={2}>
                                {handover.expected_time ? dayjs(handover.expected_time).format('YYYY-MM-DD HH:mm') : '未填写'}
                              </Descriptions.Item>
                              <Descriptions.Item label="宠物随身物品" span={2}>
                                {handover.items && handover.items.length > 0 ? (
                                  <Space wrap>
                                    {handover.items.map((it, idx) => (
                                      <Tag key={idx} color="blue">{it.name} × {it.quantity}</Tag>
                                    ))}
                                  </Space>
                                ) : '未填写'}
                              </Descriptions.Item>
                              <Descriptions.Item label="喂养/用药说明" span={2}>
                                {handover.feeding_instructions || '未填写'}
                              </Descriptions.Item>
                              <Descriptions.Item label="健康异常备注" span={2}>
                                {handover.health_notes ? (
                                  <span style={{ color: '#ef4444' }}>{handover.health_notes}</span>
                                ) : '无'}
                              </Descriptions.Item>
                              <Descriptions.Item label="交接照片" span={2}>
                                {handover.photos && handover.photos.length > 0 ? (
                                  <Space wrap>
                                    {handover.photos.map((p, idx) => (
                                      <a key={idx} href={p} target="_blank" rel="noreferrer">
                                        📷 照片 {idx + 1}
                                      </a>
                                    ))}
                                  </Space>
                                ) : '未上传'}
                              </Descriptions.Item>
                              {handover.status !== 'draft' && handover.status !== 'pending_caregiver_confirm' && (
                                <>
                                  <Descriptions.Item label="实际接收物品" span={2}>
                                    {handover.actual_items && handover.actual_items.length > 0 ? (
                                      <Space wrap>
                                        {handover.actual_items.map((it, idx) => (
                                          <Tag key={idx} color="green">{it.name} × {it.quantity}</Tag>
                                        ))}
                                      </Space>
                                    ) : '无'}
                                  </Descriptions.Item>
                                  <Descriptions.Item label="代养人补充说明" span={2}>
                                    {handover.actual_notes || '无'}
                                  </Descriptions.Item>
                                  {handover.discrepancies && handover.discrepancies.length > 0 && (
                                    <Descriptions.Item label="差异项" span={2}>
                                      <Space direction="vertical">
                                        {handover.discrepancies.map((d, idx) => (
                                          <Alert
                                            key={idx}
                                            type="warning"
                                            showIcon
                                            message={`${d.field}: ${d.description}`}
                                          />
                                        ))}
                                      </Space>
                                    </Descriptions.Item>
                                  )}
                                </>
                              )}
                              <Descriptions.Item label="确认状态" span={2}>
                                <Space>
                                  <Tag color={handover.owner_confirmed ? 'green' : 'default'}>
                                    {handover.owner_confirmed ? '✓ 主人已确认' : '主人待确认'}
                                  </Tag>
                                  <Tag color={handover.caregiver_confirmed ? 'green' : 'default'}>
                                    {handover.caregiver_confirmed ? '✓ 代养人已确认' : '代养人待确认'}
                                  </Tag>
                                </Space>
                              </Descriptions.Item>
                            </Descriptions>

                            <Space wrap>
                              {handover.status === 'draft' && isOwner && (
                                <>
                                  <Button type="primary" icon={<EditOutlined />} onClick={() => openEditHandover(handover)}>
                                    编辑
                                  </Button>
                                  <Button onClick={() => saveHandover(true)}>
                                    提交待确认
                                  </Button>
                                </>
                              )}
                              {handover.status === 'pending_caregiver_confirm' && isCaregiver && (
                                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => openCaregiverConfirm(handover)}>
                                  确认交接
                                </Button>
                              )}
                              {handover.status === 'pending_caregiver_confirm' && isOwner && handover.is_editable && (
                                <Button icon={<EditOutlined />} onClick={() => openEditHandover(handover)}>
                                  修改
                                </Button>
                              )}
                              {handover.status === 'pending_owner_confirm' && isOwner && (
                                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleOwnerFinalConfirm(handover)}>
                                  最终确认交接
                                </Button>
                              )}
                              {handover.related_dispute && (
                                <Tag color="red" icon={<WarningOutlined />}>
                                  已关联争议 #{handover.related_dispute}
                                </Tag>
                              )}
                              {handover.status === 'confirmed' && (
                                <Tag color="green" icon={<CheckCircleOutlined />}>
                                  交接已完成，不可编辑
                                </Tag>
                              )}
                            </Space>
                          </Card>
                        </List.Item>
                      );
                    }}
                  />
                )}
              </TabPane>

              <TabPane tab={<span><CheckCircleOutlined />每日服务记录</span>} key="records">
                {dailyRecords.length === 0 ? (
                  <Empty description="暂无服务记录" />
                ) : (
                  <Timeline
                    items={dailyRecords.sort((a, b) => dayjs(b.record_date).unix() - dayjs(a.record_date).unix()).map(r => ({
                      color: r.abnormal_behavior ? 'red' : 'green',
                      dot: r.abnormal_behavior ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />,
                      children: (
                        <div style={{ marginBottom: 12 }}>
                          <Space style={{ marginBottom: 8 }}>
                            <strong>{r.record_date}</strong>
                            {r.mood && <Tag>{r.mood}</Tag>}
                            {r.abnormal_behavior && <Tag color="red">有异常</Tag>}
                          </Space>
                          <div style={{ color: '#4b5563', fontSize: 13 }}>
                            <p style={{ marginBottom: 4 }}>🍚 <strong>喂养：</strong>{r.feeding_info}</p>
                            <p style={{ marginBottom: 4 }}>🐾 <strong>状态：</strong>{r.pet_status}</p>
                            {r.abnormal_behavior && (
                              <p style={{ color: '#ef4444', marginBottom: 4 }}>
                                ⚠️ <strong>异常：</strong>{r.abnormal_description}
                              </p>
                            )}
                            {r.notes && <p>📝 <strong>备注：</strong>{r.notes}</p>}
                          </div>
                        </div>
                      ),
                    }))}
                  />
                )}
              </TabPane>

              <TabPane tab={<span><SyncOutlined />变更记录</span>} key="changes">
                {orderChanges.length === 0 ? (
                  <Empty description="暂无变更记录" />
                ) : (
                  <List
                    dataSource={orderChanges.sort((a, b) => dayjs(b.created_at).unix() - dayjs(a.created_at).unix())}
                    renderItem={(change) => {
                      const ct = changeTypeMap[change.change_type];
                      const cs = changeStatusMap[change.status];
                      const isInitiator = change.initiator === user?.id;
                      const canApprove = change.status === 'pending' && !isInitiator && isOrderInvolved(detailOrder);
                      return (
                        <List.Item>
                          <Card style={{ width: '100%', borderRadius: 8 }} bodyStyle={{ padding: 16 }}>
                            <Space style={{ marginBottom: 8 }}>
                              <Tag color={ct.color} icon={<EditOutlined />}>{ct.label}</Tag>
                              <Tag color={cs.color}>{cs.label}</Tag>
                              <span style={{ color: '#6b7280', fontSize: 12 }}>
                                <ClockCircleOutlined /> {dayjs(change.created_at).format('YYYY-MM-DD HH:mm')}
                              </span>
                            </Space>
                            <Descriptions column={2} size="small" style={{ marginBottom: 8 }}>
                              <Descriptions.Item label="发起人">{change.initiator_name}</Descriptions.Item>
                              {change.confirmed_by_name && (
                                <Descriptions.Item label="确认人">{change.confirmed_by_name}</Descriptions.Item>
                              )}
                              {change.change_type === 'reschedule' && (
                                <>
                                  <Descriptions.Item label="原周期">
                                    {change.original_start_date} ~ {change.original_end_date}
                                  </Descriptions.Item>
                                  <Descriptions.Item label="新周期">
                                    {change.new_start_date} ~ {change.new_end_date}
                                  </Descriptions.Item>
                                </>
                              )}
                              {change.change_type === 'services' && (
                                <>
                                  <Descriptions.Item label="原服务">
                                    {change.original_services?.join(', ') || '-'}
                                  </Descriptions.Item>
                                  <Descriptions.Item label="新服务">
                                    {change.new_services?.join(', ') || '-'}
                                  </Descriptions.Item>
                                </>
                              )}
                              {change.change_type === 'transport' && (
                                <>
                                  <Descriptions.Item label="原方式">
                                    {change.original_transport_display || change.original_transport}
                                  </Descriptions.Item>
                                  <Descriptions.Item label="新方式">
                                    {change.new_transport_display || change.new_transport}
                                  </Descriptions.Item>
                                </>
                              )}
                              {(change.original_price !== undefined || change.new_price !== undefined) && (
                                <>
                                  <Descriptions.Item label="原价格">¥{change.original_price}</Descriptions.Item>
                                  <Descriptions.Item label="新价格">
                                    ¥{change.new_price}
                                    {change.price_diff !== undefined && change.price_diff !== 0 && (
                                      <Tag color={change.price_diff > 0 ? 'orange' : 'green'} style={{ marginLeft: 8 }}>
                                        {change.price_diff > 0 ? '+' : ''}¥{change.price_diff}
                                      </Tag>
                                    )}
                                  </Descriptions.Item>
                                </>
                              )}
                            </Descriptions>
                            <div style={{ color: '#4b5563', fontSize: 13, marginBottom: 8 }}>
                              <strong>变更原因：</strong>{change.reason}
                            </div>
                            {change.reject_reason && (
                              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>
                                <strong>拒绝原因：</strong>{change.reject_reason}
                              </div>
                            )}
                            <Space>
                              {canApprove && (
                                <>
                                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApproveChange(change)}>
                                    确认变更
                                  </Button>
                                  <Button danger icon={<CloseCircleOutlined />} onClick={() => handleRejectChange(change)}>
                                    拒绝
                                  </Button>
                                </>
                              )}
                              {change.status === 'pending' && isInitiator && (
                                <Popconfirm title="确定要取消变更申请吗？" onConfirm={() => handleCancelChange(change)}>
                                  <Button>取消申请</Button>
                                </Popconfirm>
                              )}
                            </Space>
                          </Card>
                        </List.Item>
                      );
                    }}
                  />
                )}
              </TabPane>

              <TabPane tab={<span><WarningOutlined />争议协商</span>} key="disputes">
                {orderDisputes.length === 0 ? (
                  <Empty description="暂无争议记录" />
                ) : (
                  <div>
                    {orderDisputes.map((dispute) => {
                      const ds = disputeStatusMap[dispute.status];
                      const tt = triggerTypeMap[dispute.trigger_type];
                      const isActive = dispute.status === 'open' && activeDispute?.id === dispute.id;
                      return (
                        <Card key={dispute.id} style={{ marginBottom: 16, borderRadius: 8 }}>
                          <div style={{ marginBottom: 12 }}>
                            <Space>
                              <Tag color={ds.color} icon={<SolutionOutlined />}>{ds.label}</Tag>
                              <Tag color={tt.color}>{tt.label}</Tag>
                              <strong style={{ fontSize: 15 }}>{dispute.title}</strong>
                            </Space>
                            <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                              发起人：{dispute.initiator_name} · 发起时间：{dayjs(dispute.opened_at).format('YYYY-MM-DD HH:mm')}
                              {dispute.resolved_at && ` · 解决时间：${dayjs(dispute.resolved_at).format('YYYY-MM-DD HH:mm')}`}
                            </div>
                          </div>

                          {isActive && activeDispute?.messages && (
                            <>
                              <Divider orientation="left"><MessageOutlined /> 协商时间线</Divider>
                              <Timeline
                                style={{ marginBottom: 16 }}
                                items={activeDispute.messages.map((msg: DisputeMessage) => ({
                                  color: msg.is_system ? 'gray' : (msg.sender_role === 'owner' ? 'blue' : 'green'),
                                  dot: msg.is_system ? <CarryOutOutlined /> : <MessageOutlined />,
                                  children: (
                                    <div>
                                      <Space style={{ marginBottom: 4 }}>
                                        <strong>{msg.is_system ? '系统' : (msg.sender_name || msg.sender_role_display)}</strong>
                                        <Tag color={msg.is_system ? 'default' : (msg.sender_role === 'owner' ? 'blue' : 'green')}>
                                          {msg.sender_role_display}
                                        </Tag>
                                        <span style={{ color: '#6b7280', fontSize: 12 }}>
                                          {dayjs(msg.created_at).format('MM-DD HH:mm')}
                                        </span>
                                      </Space>
                                      <div style={{ color: '#4b5563', fontSize: 13 }}>{msg.content}</div>
                                    </div>
                                  ),
                                }))}
                              />

                              {dispute.status === 'open' && (
                                <Form form={disputeMsgForm} layout="inline" style={{ marginBottom: 12 }}>
                                  <Form.Item name="content" style={{ flex: 1 }} rules={[{ required: true, message: '请输入消息' }]}>
                                    <Input.TextArea rows={2} placeholder="输入协商消息..." style={{ width: '100%' }} />
                                  </Form.Item>
                                  <Form.Item>
                                    <Space>
                                      <Button type="primary" onClick={handleSendDisputeMsg}>
                                        发送消息
                                      </Button>
                                      <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleResolveDispute}>
                                        解决争议
                                      </Button>
                                      <Button onClick={handleCloseDispute}>关闭争议</Button>
                                    </Space>
                                  </Form.Item>
                                </Form>
                              )}

                              {dispute.resolution && (
                                <Alert
                                  message={`解决方案：${dispute.resolution}`}
                                  type="success"
                                  showIcon
                                />
                              )}
                            </>
                          )}

                          {!isActive && (
                            <div>
                              <div style={{ color: '#4b5563', fontSize: 13, marginBottom: 8 }}>
                                <strong>描述：</strong>{dispute.description}
                              </div>
                              {dispute.resolution && (
                                <Alert
                                  message={`解决方案：${dispute.resolution}`}
                                  type="success"
                                  showIcon
                                />
                              )}
                              {dispute.status === 'open' && (
                                <Button
                                  style={{ marginTop: 8 }}
                                  type="primary"
                                  onClick={async () => {
                                    const detail = await disputeApi.get(dispute.id);
                                    setActiveDispute(detail.data);
                                  }}
                                >
                                  进入协商
                                </Button>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabPane>

              <TabPane tab={<span><StarOutlined />双方评价</span>} key="reviews">
                {orderReviews.length === 0 ? (
                  <Empty description="暂无评价" />
                ) : (
                  <List
                    dataSource={orderReviews}
                    renderItem={(r) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar size={40}>{r.reviewer_name?.charAt(0)}</Avatar>}
                          title={
                            <Space>
                              <span style={{ fontWeight: 500 }}>
                                {r.reviewer_name}
                                <Tag color={r.role === 'owner' ? 'blue' : 'green'} style={{ marginLeft: 6 }}>
                                  {r.role === 'owner' ? '主人评价' : '代养人评价'}
                                </Tag>
                              </span>
                              <Rate disabled value={r.rating} allowHalf style={{ fontSize: 14 }} />
                            </Space>
                          }
                          description={
                            <div>
                              <p style={{ color: '#4b5563' }}>{r.content}</p>
                              <Space>
                                {r.tags?.map(t => <Tag key={t}>{t}</Tag>)}
                              </Space>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </TabPane>

              <TabPane tab={<span><BankOutlined />费用托管</span>} key="escrow">
                {!detailOrder.escrow_info ? (
                  <Empty description="暂无托管信息" />
                ) : (
                  <div>
                    <Card style={{ marginBottom: 16, borderRadius: 8 }}>
                      <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="托管状态">
                          <Tag color={escrowStatusMap[detailOrder.escrow_info.status].color}>
                            {escrowStatusMap[detailOrder.escrow_info.status].label}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="托管总额">
                          <strong style={{ color: '#52c41a' }}>¥{detailOrder.escrow_info.total_amount}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="平台服务费 (10%)">
                          <span style={{ color: '#f97316' }}>¥{detailOrder.escrow_info.platform_fee}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label="代养人应收">
                          <strong style={{ color: '#1677ff' }}>¥{detailOrder.escrow_info.caregiver_amount}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="已退款金额">
                          <span style={{ color: '#ef4444' }}>¥{detailOrder.escrow_info.refund_amount}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label="支付时间">
                          {detailOrder.escrow_info.paid_at ? dayjs(detailOrder.escrow_info.paid_at).format('YYYY-MM-DD HH:mm') : '未支付'}
                        </Descriptions.Item>
                        <Descriptions.Item label="结算时间">
                          {detailOrder.escrow_info.settled_at ? dayjs(detailOrder.escrow_info.settled_at).format('YYYY-MM-DD HH:mm') : '未结算'}
                        </Descriptions.Item>
                        <Descriptions.Item label="退款时间">
                          {detailOrder.escrow_info.refunded_at ? dayjs(detailOrder.escrow_info.refunded_at).format('YYYY-MM-DD HH:mm') : '无'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {detailOrder.escrow_info.status === 'unpaid' && detailOrder.owner === user?.id && (
                      <Button type="primary" icon={<PayCircleOutlined />} size="large" block
                        onClick={() => handlePayEscrow(detailOrder)}
                        style={{ background: '#faad14', borderColor: '#faad14' }}>
                        支付托管金额 ¥{detailOrder.escrow_info.total_amount}
                      </Button>
                    )}

                    {detailOrder.can_settle && (
                      <Button type="primary" icon={<DollarOutlined />} size="large" block
                        onClick={() => handleSettle(detailOrder)}
                        style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                        结算给代养人 ¥{detailOrder.escrow_info.caregiver_amount}
                      </Button>
                    )}

                    {detailOrder.settlement_blocked_reasons && detailOrder.settlement_blocked_reasons.length > 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 16 }}
                        message={
                          <div>
                            <strong>⚠️ 托管资金暂无法结算，原因如下：</strong>
                            <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                              {detailOrder.settlement_blocked_reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        }
                      />
                    )}
                  </div>
                )}
              </TabPane>

              <TabPane tab={<span><RollbackOutlined />退款申请</span>} key="refunds">
                <div style={{ marginBottom: 16 }}>
                  {detailOrder.escrow_info?.status === 'held' && detailOrder.owner === user?.id && (
                    <Button type="primary" icon={<RollbackOutlined />} onClick={() => openRefundModal(detailOrder)}>
                      申请退款
                    </Button>
                  )}
                </div>
                {orderRefunds.length === 0 ? (
                  <Empty description="暂无退款申请" />
                ) : (
                  <List
                    dataSource={orderRefunds.sort((a, b) => dayjs(b.created_at).unix() - dayjs(a.created_at).unix())}
                    renderItem={(refund) => {
                      const rs = refundStatusMap[refund.status];
                      const isInitiator = refund.initiator === user?.id;
                      const isCaregiver = detailOrder.caregiver === user?.id;
                      return (
                        <List.Item>
                          <Card style={{ width: '100%', borderRadius: 8 }}>
                            <Space style={{ marginBottom: 12 }} wrap>
                              <Tag color={rs.color}>{rs.label}</Tag>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#ef4444' }}>
                                退款 ¥{refund.amount}
                              </span>
                              <span style={{ color: '#6b7280', fontSize: 12 }}>
                                申请人：{refund.initiator_name} · {dayjs(refund.created_at).format('YYYY-MM-DD HH:mm')}
                              </span>
                            </Space>
                            <div style={{ color: '#4b5563', marginBottom: 12 }}>
                              <strong>退款原因：</strong>{refund.reason}
                            </div>
                            {refund.reject_reason && (
                              <Alert type="error" message={`拒绝原因：${refund.reject_reason}`} style={{ marginBottom: 12 }} />
                            )}
                            {refund.handled_at && (
                              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>
                                处理时间：{dayjs(refund.handled_at).format('YYYY-MM-DD HH:mm')}
                                {refund.handled_by_name && ` · 处理人：${refund.handled_by_name}`}
                              </div>
                            )}
                            {refund.status === 'pending' && (
                              <Space>
                                {isCaregiver && (
                                  <>
                                    <Button type="primary" onClick={() => handleApproveRefund(refund)}>
                                      同意退款
                                    </Button>
                                    <Button danger onClick={() => handleRejectRefund(refund)}>
                                      拒绝退款
                                    </Button>
                                  </>
                                )}
                                {isInitiator && (
                                  <Button onClick={() => handleCancelRefund(refund)}>
                                    取消申请
                                  </Button>
                                )}
                              </Space>
                            )}
                          </Card>
                        </List.Item>
                      );
                    }}
                  />
                )}
              </TabPane>
            </Tabs>
          </div>
        )}
      </Modal>

      {/* 交接清单 Modal */}
      <Modal
        title={editingHandover ? '✏️ 编辑交接清单' : '📋 发起交接清单'}
        open={handoverModal}
        onCancel={() => setHandoverModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setHandoverModal(false)}>
            取消
          </Button>,
          <Button key="save" onClick={() => saveHandover(false)}>
            保存草稿
          </Button>,
          <Button key="submit" type="primary" onClick={() => saveHandover(true)}>
            提交待确认
          </Button>,
        ]}
        width={700}
      >
        <Form form={handoverForm} layout="vertical">
          <Form.Item name="stage" label="交接阶段" rules={[{ required: true }]}>
            <Select>
              <Option value="start">开始服务交接</Option>
              <Option value="end">结束服务交接</Option>
            </Select>
          </Form.Item>

          <Divider orientation="left">📦 宠物随身物品</Divider>
          {handoverItems.map((item, idx) => (
            <Row key={idx} gutter={8} style={{ marginBottom: 8 }}>
              <Col span={10}>
                <Input
                  placeholder="物品名称"
                  value={item.name}
                  onChange={(e) => updateHandoverItem(idx, 'name', e.target.value)}
                />
              </Col>
              <Col span={10}>
                <Input
                  placeholder="数量/规格"
                  value={item.quantity}
                  onChange={(e) => updateHandoverItem(idx, 'quantity', e.target.value)}
                />
              </Col>
              <Col span={4}>
                <Button
                  type="text"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeHandoverItem(idx)}
                />
              </Col>
            </Row>
          ))}
          <Button icon={<PlusOutlined />} onClick={addHandoverItem} style={{ marginBottom: 16 }}>
            添加物品
          </Button>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="feeding_instructions" label="🍚 喂养/用药说明">
                <TextArea rows={3} placeholder="喂食时间、食物种类、用药剂量等..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="health_notes" label="⚠️ 健康异常备注">
                <TextArea rows={3} placeholder="如有健康异常请填写，将自动触发争议提示..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location" label="📍 接送地点">
                <Input placeholder="请输入详细接送地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expected_time" label="⏰ 预计交接时间">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">📷 交接照片</Divider>
          {handoverPhotos.map((photo, idx) => (
            <Row key={idx} gutter={8} style={{ marginBottom: 8 }}>
              <Col span={20}>
                <Input
                  placeholder="照片 URL"
                  value={photo}
                  onChange={(e) => updatePhotoUrl(idx, e.target.value)}
                />
              </Col>
              <Col span={4}>
                <Button
                  type="text"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => removePhotoUrl(idx)}
                />
              </Col>
            </Row>
          ))}
          <Button icon={<PlusOutlined />} onClick={addPhotoUrl}>
            添加照片链接
          </Button>
        </Form>
      </Modal>

      {/* 代养人确认交接 Modal */}
      <Modal
        title="🤝 确认交接"
        open={caregiverConfirmModal}
        onCancel={() => setCaregiverConfirmModal(false)}
        onOk={submitCaregiverConfirm}
        okText="确认交接"
        cancelText="取消"
        width={700}
      >
        {confirmingHandover && (
          <div>
            <Alert
              message="请仔细核对主人提交的交接清单，如存在差异请标记"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="主人填写的物品">
                {confirmingHandover.items && confirmingHandover.items.length > 0 ? (
                  <Space wrap>
                    {confirmingHandover.items.map((it, idx) => (
                      <Tag key={idx} color="blue">{it.name} × {it.quantity}</Tag>
                    ))}
                  </Space>
                ) : '无'}
              </Descriptions.Item>
              <Descriptions.Item label="喂养/用药说明">
                {confirmingHandover.feeding_instructions || '无'}
              </Descriptions.Item>
              <Descriptions.Item label="健康异常备注">
                {confirmingHandover.health_notes ? (
                  <span style={{ color: '#ef4444' }}>{confirmingHandover.health_notes}</span>
                ) : '无'}
              </Descriptions.Item>
              <Descriptions.Item label="接送地点">
                {confirmingHandover.location || '未填写'}
              </Descriptions.Item>
            </Descriptions>

            <Form form={caregiverConfirmForm} layout="vertical">
              <Divider orientation="left">📦 实际接收物品</Divider>
              {actualItems.map((item, idx) => (
                <Row key={idx} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Input
                      placeholder="物品名称"
                      value={item.name}
                      onChange={(e) => updateActualItem(idx, 'name', e.target.value)}
                    />
                  </Col>
                  <Col span={10}>
                    <Input
                      placeholder="数量/规格"
                      value={item.quantity}
                      onChange={(e) => updateActualItem(idx, 'quantity', e.target.value)}
                    />
                  </Col>
                  <Col span={4}>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeActualItem(idx)}
                    />
                  </Col>
                </Row>
              ))}
              <Button icon={<PlusOutlined />} onClick={addActualItem} style={{ marginBottom: 16 }}>
                添加物品
              </Button>

              <Form.Item name="actual_notes" label="📝 代养人补充说明">
                <TextArea rows={2} placeholder="其他需要说明的实际接收情况..." />
              </Form.Item>

              <Form.Item name="has_discrepancies" label="⚠️ 是否存在差异或健康异常" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>

              <Divider orientation="left">❌ 差异项（如有）</Divider>
              {discrepancies.map((d, idx) => (
                <Row key={idx} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={8}>
                    <Input
                      placeholder="差异字段（物品/健康/其他）"
                      value={d.field}
                      onChange={(e) => updateDiscrepancy(idx, 'field', e.target.value)}
                    />
                  </Col>
                  <Col span={12}>
                    <Input
                      placeholder="差异描述"
                      value={d.description}
                      onChange={(e) => updateDiscrepancy(idx, 'description', e.target.value)}
                    />
                  </Col>
                  <Col span={4}>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeDiscrepancy(idx)}
                    />
                  </Col>
                </Row>
              ))}
              <Button icon={<PlusOutlined />} onClick={addDiscrepancy}>
                添加差异项
              </Button>
              <Alert
                message="如存在差异或健康异常，系统将自动创建争议进行协商"
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            </Form>
          </div>
        )}
      </Modal>

      {/* 退款申请 Modal */}
      <Modal
        title={<span><RollbackOutlined /> 申请退款</span>}
        open={refundModal}
        onOk={submitRefund}
        onCancel={() => setRefundModal(false)}
        okText="提交退款申请"
        cancelText="取消"
        width={500}
      >
        {currentOrder && (
          <Form form={refundForm} layout="vertical">
            <Alert
              message="退款申请需要代养人确认后方可生效"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              label="退款金额（元）"
              name="amount"
              rules={[
                { required: true, message: '请输入退款金额' },
                {
                  validator: (_, value) => {
                    if (value <= 0) return Promise.reject('退款金额必须大于 0');
                    if (value > (currentOrder.escrow_info?.total_amount || currentOrder.total_price)) {
                      return Promise.reject('退款金额不能超过托管总额');
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={currentOrder.escrow_info?.total_amount || currentOrder.total_price}
                step={1}
                placeholder="请输入退款金额"
              />
            </Form.Item>
            <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>
              托管总额：¥{currentOrder.escrow_info?.total_amount || currentOrder.total_price}
            </div>
            <Form.Item
              label="退款原因"
              name="reason"
              rules={[{ required: true, message: '请填写退款原因' }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="请详细说明退款原因..."
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
