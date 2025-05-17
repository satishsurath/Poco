import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import api from '../services/api';

const BackupsPage = () => {
  const [backups, setBackups] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [targetConnection, setTargetConnection] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Form state for creating backup
  const [backupForm, setBackupForm] = useState({
    connection_id: '',
    name: ''
  });

  // Fetch backups and connections on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [backupsRes, connectionsRes] = await Promise.all([
          api.get('/backups'),
          api.get('/connections')
        ]);
        setBackups(backupsRes.data);
        setConnections(connectionsRes.data);
        
        // Set default connection if available
        if (connectionsRes.data.length > 0) {
          setBackupForm(prev => ({
            ...prev,
            connection_id: connectionsRes.data[0].id
          }));
        }
      } catch (err) {
        showSnackbar('Failed to fetch data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateBackup = async () => {
    try {
      await api.post('/backups', backupForm);
      const response = await api.get('/backups');
      setBackups(response.data);
      setOpenCreateDialog(false);
      showSnackbar('Backup created successfully', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Failed to create backup', 'error');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup || !targetConnection) return;
    
    try {
      await api.post(`/connections/${targetConnection}/restore`, {
        backup_id: selectedBackup.id
      });
      setOpenRestoreDialog(false);
      showSnackbar('Backup restored successfully', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Failed to restore backup', 'error');
    }
  };

  const handleDeleteBackup = async (id) => {
    if (window.confirm('Are you sure you want to delete this backup?')) {
      try {
        await api.delete(`/backups/${id}`);
        setBackups(backups.filter(backup => backup.id !== id));
        showSnackbar('Backup deleted successfully', 'success');
      } catch (err) {
        showSnackbar('Failed to delete backup', 'error');
      }
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getConnectionName = (connectionId) => {
    const connection = connections.find(c => c.id === connectionId);
    return connection ? connection.name : 'Unknown';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Database Backups</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpenCreateDialog(true)}
        >
          Create Backup
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : backups.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary" align="center">
              No backups found. Create your first backup to get started.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Connection</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell>{backup.filename}</TableCell>
                  <TableCell>{getConnectionName(backup.connection_id)}</TableCell>
                  <TableCell>{formatFileSize(backup.size_mb * 1024 * 1024)}</TableCell>
                  <TableCell>{new Date(backup.created_at).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Restore">
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setSelectedBackup(backup);
                          setOpenRestoreDialog(true);
                        }}
                      >
                        <RestoreIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteBackup(backup.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Backup Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Backup</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Connection</InputLabel>
                <Select
                  value={backupForm.connection_id}
                  onChange={(e) => setBackupForm({ ...backupForm, connection_id: e.target.value })}
                  label="Connection"
                  required
                >
                  {connections.map((conn) => (
                    <MenuItem key={conn.id} value={conn.id}>
                      {conn.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Backup Name"
                value={backupForm.name}
                onChange={(e) => setBackupForm({ ...backupForm, name: e.target.value })}
                placeholder="e.g., pre-deployment-backup"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateBackup} color="primary" variant="contained">
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={openRestoreDialog} onClose={() => setOpenRestoreDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select target connection to restore the backup to:
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel>Target Connection</InputLabel>
            <Select
              value={targetConnection}
              onChange={(e) => setTargetConnection(e.target.value)}
              label="Target Connection"
              required
            >
              {connections.map((conn) => (
                <MenuItem key={conn.id} value={conn.id}>
                  {conn.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedBackup && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Backup Details:</Typography>
              <Typography variant="body2">
                <strong>File:</strong> {selectedBackup.filename}<br />
                <strong>From:</strong> {getConnectionName(selectedBackup.connection_id)}<br />
                <strong>Created:</strong> {new Date(selectedBackup.created_at).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                <strong>Warning:</strong> This will overwrite data in the target connection!
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRestoreDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleRestoreBackup} 
            color="primary" 
            variant="contained"
            disabled={!targetConnection}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BackupsPage;
