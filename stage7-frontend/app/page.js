'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, ToggleButtonGroup, ToggleButton,
  CircularProgress, Alert, Pagination, TextField, InputAdornment,
  Chip, Skeleton, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import Navbar from './components/Navbar';
import NotificationCard from './components/NotificationCard';
import { fetchNotifications } from './lib/api';

const TYPES = ['All', 'Event', 'Result', 'Placement'];

export default function HomePage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewedIds, setViewedIds] = useState(new Set());

  // Load viewed IDs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('viewedNotifications');
    if (stored) {
      setViewedIds(new Set(JSON.parse(stored)));
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (typeFilter !== 'All') params.notification_type = typeFilter;
      const data = await fetchNotifications(params);
      setNotifications(data.notifications || []);
    } catch (err) {
      setError('Failed to load notifications. Please try again.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkViewed = (id) => {
    setViewedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('viewedNotifications', JSON.stringify([...next]));
      return next;
    });
  };

  const filtered = notifications.filter(n =>
    n.Message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = notifications.filter(n => !viewedIds.has(n.ID)).length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar unreadCount={unreadCount} />

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom sx={{
            background: 'linear-gradient(90deg, #fff, #B0BEC5)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            All Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stay updated with placements, events, and results
          </Typography>
        </Box>

        {/* Filters Bar */}
        <Box sx={{
          display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center',
          p: 2, borderRadius: 2, bgcolor: 'background.paper',
          border: '1px solid rgba(124, 77, 255, 0.1)',
        }}>
          <FilterListIcon sx={{ color: 'text.secondary' }} />

          <ToggleButtonGroup
            value={typeFilter}
            exclusive
            onChange={(e, val) => { if (val) { setTypeFilter(val); setPage(1); } }}
            size="small"
            id="type-filter-group"
          >
            {TYPES.map(type => (
              <ToggleButton
                key={type}
                value={type}
                id={`filter-${type.toLowerCase()}`}
                sx={{
                  textTransform: 'none', px: 2, borderRadius: '8px !important',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main', color: '#fff',
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                {type}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-notifications"
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
            sx={{ ml: 'auto', minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel id="limit-label">Limit</InputLabel>
            <Select
              labelId="limit-label"
              id="limit-select"
              value={limit}
              label="Limit"
              onChange={(e) => { setLimit(e.target.value); setPage(1); }}
            >
              {[10, 15, 20, 50].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} id="error-alert">
            {error}
          </Alert>
        )}

        {/* Loading state */}
        {loading && (
          <Box>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1.5, borderRadius: 2 }} />
            ))}
          </Box>
        )}

        {/* Notifications List */}
        {!loading && filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">No notifications found</Typography>
          </Box>
        )}

        {!loading && filtered.map(notification => (
          <NotificationCard
            key={notification.ID}
            notification={notification}
            isViewed={viewedIds.has(notification.ID)}
            onView={handleMarkViewed}
          />
        ))}

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={10}
              page={page}
              onChange={(e, v) => setPage(v)}
              color="primary"
              id="pagination"
              sx={{
                '& .MuiPaginationItem-root': { borderRadius: 2 },
              }}
            />
          </Box>
        )}

        {/* Stats */}
        {!loading && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Chip label={`Showing: ${filtered.length}`} size="small" variant="outlined" />
            <Chip label={`New: ${unreadCount}`} size="small" color="success" variant="outlined" />
            <Chip label={`Viewed: ${viewedIds.size}`} size="small" color="default" variant="outlined" />
          </Box>
        )}
      </Container>

      {/* Pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Box>
  );
}
