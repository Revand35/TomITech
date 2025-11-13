import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { deleteMateri, getAllMateri } from '../services/materiService';

const MaterialItem = ({ item, onEdit, onDelete }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.judul}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.deskripsi || 'Tidak ada deskripsi'}
        </Text>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{item.nama_file}</Text>
          <Text style={styles.fileSize}>{formatFileSize(item.ukuran_file)}</Text>
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}>
          <MaterialIcons name="edit" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item)} style={styles.actionButton}>
          <MaterialIcons name="delete" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default function MaterialList({ onEditMaterial }) {
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMaterials = async () => {
    try {
      const data = await getAllMateri();
      setMaterials(data);
    } catch (error) {
      console.error('Error loading materials:', error);
      Alert.alert('Error', 'Gagal memuat daftar materi');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMaterials();
  };

  const handleDelete = async (material) => {
    Alert.alert(
      'Hapus Materi',
      `Anda yakin ingin menghapus "${material.judul}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMateri(material.id, material.url_file);
              await loadMaterials();
              Alert.alert('Sukses', 'Materi berhasil dihapus');
            } catch (error) {
              console.error('Error deleting material:', error);
              Alert.alert('Error', 'Gagal menghapus materi');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <FlatList
      data={materials}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <MaterialItem
          item={item}
          onEdit={onEditMaterial}
          onDelete={handleDelete}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Belum ada materi</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
    marginRight: 8,
  },
  fileSize: {
    fontSize: 12,
    color: '#6c757d',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
});
