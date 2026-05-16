'use client';
import { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Chip, CircularProgress, Alert,
  Skeleton, Select, MenuItem, FormControl, InputLabel, Card, CardContent
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import WorkIcon from '@mui/icons-material/Work';
import EventIcon from '@mui/icons-material/Event';
import GradeIcon from '@mui/icons-material/Grade';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Navbar from '../components/Navbar';
import { fetchNotifications } from '../lib/api';

const TYPE_WEIGHT = { Placement: 3, Result: 2, Event: 1 };
const TYPE_CONFIG = {
  Placement: { icon: <WorkIcon />, color: '#7C4DFF', label: 'Placement' },
  Event:     { icon: <EventIcon />, color: '#00E5FF', label: 'Event' },
  Result:    { icon: <GradeIcon />, color: '#FFD600', label: 'Result' },
};

function computeScore(notification) {
  const weight = TYPE_WEIGHT[notification.Type] || 0;
  const ts = new Date(notification.Timestamp).getTime();
  return weight * 1e15 + ts;
}

export default function PriorityPage() {
  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topN, setTopN] = useState(10);
  const [viewedIds, setViewedIds] = useState(new Set());

  useEffect(() => {
    const stored = localStorage.getItem('viewedNotifications');
    if (stored) setViewedIds(new Set(JSON.parse(stored)));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNotifications({ limit: 100 });
        setAllNotifications(data.notifications || []);
      } catch (err) {
        setError('Failed to load notifications.');
        setAllNotifications([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute priority and take top N
  const prioritized = [...allNotifications]
    .map(n => ({ ...n, score: computeScore(n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  const handleMarkViewed = (id) => {
    setViewedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('viewedNotifications', JSON.stringify([...next]));
      return next;
    });
  };

  const typeCounts = prioritized.reduce((acc, n) => {
    acc[n.Type] = (acc[n.Type] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar unreadCount={allNotifications.filter(n => !viewedIds.has(n.ID)).length} />

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <StarIcon sx={{ color: '#FFD600', fontSize: 32 }} />
          <Typography variant="h4" sx={{
            background: 'linear-gradient(90deg, #FFD600, #FF9100)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Priority Inbox
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Top {topN} most important unread notifications (Placement &gt; Result &gt; Event, then recency)
        </Typography>

        {/* Controls */}
        <Box sx={{
          display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap',
          p: 2, borderRadius: 2, bgcolor: 'background.paper',
          border: '1px solid rgba(255, 214, 0, 0.15)',
        }}>
          <TrendingUpIcon sx={{ color: '#FFD600' }} />
          <Typography variant="body2" color="text.secondary">Display top</Typography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              id="top-n-select"
            >
              {[5, 10, 15, 20, 50].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">notifications</Typography>

          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            {Object.entries(typeCounts).map(([type, count]) => {
              const c = TYPE_CONFIG[type];
              return (
                <Chip key={type} label={`${c?.label}: ${count}`} size="small"
                  sx={{ bgcolor: `${c?.color}15`, color: c?.color, border: `1px solid ${c?.color}33` }}
                />
              );
            })}
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {loading && [...Array(5)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1.5, borderRadius: 2 }} />
        ))}

        {/* Priority List */}
        {!loading && prioritized.map((notification, index) => {
          const config = TYPE_CONFIG[notification.Type] || TYPE_CONFIG.Event;
          const isViewed = viewedIds.has(notification.ID);

          return (
            <Card
              key={notification.ID}
              id={`priority-${index + 1}`}
              sx={{
                mb: 1.5, position: 'relative', cursor: 'pointer',
                transition: 'all 0.3s ease',
                opacity: isViewed ? 0.6 : 1,
                borderLeft: `4px solid ${config.color}`,
                background: isViewed
                  ? 'rgba(18,24,41,0.5)'
                  : `linear-gradient(135deg, ${config.color}08, rgba(18,24,41,0.95))`,
                '&:hover': { transform: 'translateX(6px)', boxShadow: `0 4px 24px ${config.color}22` },
              }}
              onClick={() => handleMarkViewed(notification.ID)}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                {/* Rank Badge */}
                <Box sx={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                  fontSize: 14, flexShrink: 0,
                  bgcolor: index < 3 ? '#FFD60033' : 'rgba(255,255,255,0.05)',
                  color: index < 3 ? '#FFD600' : 'text.secondary',
                  border: index < 3 ? '2px solid #FFD60066' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  #{index + 1}
                </Box>

                {/* Icon */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, borderRadius: 2,
                  bgcolor: `${config.color}15`, color: config.color, flexShrink: 0,
                }}>
                  {config.icon}
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight={600} noWrap>
                    {notification.Message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(notification.Timestamp).toLocaleString()}
                  </Typography>
                </Box>

                <Chip label={config.label} size="small"
                  sx={{ bgcolor: `${config.color}15`, color: config.color, border: `1px solid ${config.color}33`, fontSize: '0.7rem' }}
                />

                {isViewed && (
                  <Chip label="Viewed" size="small" variant="outlined" sx={{ fontSize: '0.65rem', opacity: 0.6 }} />
                )}
              </CardContent>
            </Card>
          );
        })}

        {!loading && prioritized.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">No notifications available</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
