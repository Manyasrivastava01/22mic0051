'use client';
import { AppBar, Toolbar, Typography, Box, Badge, IconButton, Button } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StarIcon from '@mui/icons-material/Star';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar({ unreadCount = 0 }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(90deg, rgba(10,14,26,0.95) 0%, rgba(18,24,41,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(124, 77, 255, 0.2)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsIcon sx={{ color: '#7C4DFF', fontSize: 28 }} />
          <Typography
            variant="h6"
            sx={{
              background: 'linear-gradient(90deg, #7C4DFF, #00E5FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={() => router.push('/')}
          >
            Campus Notifications
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            id="nav-all-notifications"
            variant={pathname === '/' ? 'contained' : 'text'}
            size="small"
            startIcon={
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <NotificationsIcon />
              </Badge>
            }
            onClick={() => router.push('/')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              ...(pathname === '/' && {
                background: 'linear-gradient(135deg, #7C4DFF, #651FFF)',
              }),
            }}
          >
            All
          </Button>

          <Button
            id="nav-priority-inbox"
            variant={pathname === '/priority' ? 'contained' : 'text'}
            size="small"
            startIcon={<StarIcon />}
            onClick={() => router.push('/priority')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              ...(pathname === '/priority' && {
                background: 'linear-gradient(135deg, #FFD600, #FF9100)',
              }),
            }}
          >
            Priority
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
