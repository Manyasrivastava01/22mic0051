'use client';
import { Card, CardContent, Typography, Chip, Box, IconButton, Tooltip } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import EventIcon from '@mui/icons-material/Event';
import GradeIcon from '@mui/icons-material/Grade';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import VisibilityIcon from '@mui/icons-material/Visibility';

const TYPE_CONFIG = {
  Placement: { icon: <WorkIcon />, color: '#7C4DFF', bgColor: 'rgba(124, 77, 255, 0.1)', label: 'Placement' },
  Event:     { icon: <EventIcon />, color: '#00E5FF', bgColor: 'rgba(0, 229, 255, 0.1)', label: 'Event' },
  Result:    { icon: <GradeIcon />, color: '#FFD600', bgColor: 'rgba(255, 214, 0, 0.1)', label: 'Result' },
};

export default function NotificationCard({ notification, isViewed, onView }) {
  const config = TYPE_CONFIG[notification.Type] || TYPE_CONFIG.Event;
  const formattedDate = new Date(notification.Timestamp).toLocaleString();

  return (
    <Card
      id={`notification-${notification.ID}`}
      sx={{
        mb: 1.5,
        position: 'relative',
        transition: 'all 0.3s ease',
        opacity: isViewed ? 0.65 : 1,
        borderLeft: `4px solid ${config.color}`,
        background: isViewed
          ? 'rgba(18, 24, 41, 0.6)'
          : `linear-gradient(135deg, ${config.bgColor}, rgba(18, 24, 41, 0.9))`,
        '&:hover': {
          transform: 'translateX(4px)',
          boxShadow: `0 4px 20px ${config.color}22`,
          opacity: 1,
        },
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, borderRadius: 2,
          bgcolor: config.bgColor, color: config.color, flexShrink: 0,
        }}>
          {config.icon}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body1" fontWeight={600} noWrap>
              {notification.Message}
            </Typography>
            {!isViewed && (
              <FiberNewIcon sx={{ color: '#00E676', fontSize: 20, animation: 'pulse 2s infinite' }} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formattedDate}
          </Typography>
        </Box>

        <Chip
          label={config.label}
          size="small"
          sx={{
            bgcolor: config.bgColor,
            color: config.color,
            border: `1px solid ${config.color}33`,
            fontSize: '0.7rem',
          }}
        />

        <Tooltip title={isViewed ? 'Already viewed' : 'Mark as viewed'}>
          <IconButton
            size="small"
            onClick={() => onView(notification.ID)}
            sx={{ color: isViewed ? 'text.disabled' : config.color }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
