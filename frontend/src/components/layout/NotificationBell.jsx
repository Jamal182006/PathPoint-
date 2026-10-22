import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../../api/notificationsApi';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await notificationsApi.list();
        if (active) {
          setNotifications(result.data || []);
          setUnreadCount(result.unreadCount || 0);
        }
      } catch {
        // Keep the existing list visible during brief API outages.
      }
    };
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    const intervalId = window.setInterval(refresh, 10000);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  useEffect(() => {
    const closeOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const markRead = (notification) => {
    if (notification.read) return;
    setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, read: true } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
    notificationsApi.markRead(notification._id).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      // The next poll reconciles local state with the server.
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-600 px-1 text-xs font-bold leading-none text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <section aria-label="Notifications" className="ui-popover absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden animate-fade-in">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div><h2 className="text-sm font-bold text-slate-900">Notifications</h2><p className="text-xs text-slate-500">{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</p></div>
            {unreadCount > 0 && <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>}
          </header>
          <div className="max-h-[min(24rem,65vh)] overflow-y-auto">
            {notifications.length ? notifications.map((notification) => {
              const content = <><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-brand-600'}`} /><span className="min-w-0 flex-1"><span className="block text-sm leading-5 text-slate-800">{notification.message}</span><time className="mt-1 block text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</time></span></>;
              return notification.link ? (
                <Link key={notification._id} to={notification.link} onClick={() => { markRead(notification); setOpen(false); }} className="flex gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50">{content}</Link>
              ) : (
                <button key={notification._id} type="button" onClick={() => markRead(notification)} className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50">{content}</button>
              );
            }) : <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>}
          </div>
        </section>
      )}
    </div>
  );
};

export default NotificationBell;
