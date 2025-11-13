import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { uploadFile, updateMateri } from '../services/materiService';

export default function MaterialForm({ material, onSuccess, onCancel }) {
  const [judul, setJudul] = useState(material?.judul || '');
  const [deskripsi, setDeskripsi] = useState(material?.deskripsi || '');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setFile(result);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Gagal memilih dokumen');
    }
  };

  const handleSubmit = async () => {
    if (!judul.trim()) {
      Alert.alert('Error', 'Judul tidak boleh kosong');
      return;
    }

    if (!material && !file) {
      Alert.alert('Error', 'Silakan pilih file');
      return;
    }

    setIsLoading(true);

    try {
      if (material) {
        // Update existing material
        await updateMateri(material.id, { judul, deskripsi });
        Alert.alert('Sukses', 'Materi berhasil diperbarui');
      } else {
        // Upload new file
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        const fileContent = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const blob = `data:${file.mimeType};base64,${fileContent}`;
        const response = await fetch(blob);
        const fileBlob = await response.blob();
        
        await uploadFile(
          new File([fileBlob], file.name, { type: file.mimeType }),
          { judul, deskripsi }
        );
        
        Alert.alert('Sukses', 'Materi berhasil diunggah');
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Judul*</Text>
      <TextInput
        style={styles.input}
        value={judul}
        onChangeText={setJudul}
        placeholder="Masukkan judul materi"
      />

      <Text style={styles.label}>Deskripsi</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
        value={deskripsi}
        onChangeText={setDeskripsi}
        placeholder="Masukkan deskripsi materi"
        multiline
      />

      {!material && (
        <>
          <Text style={styles.label}>File Materi*</Text>
          <Button
            title={file ? file.name : 'Pilih File'}
            onPress={pickDocument}
            disabled={isLoading}
          />
          <Text style={styles.helperText}>
            Format yang didukung: PDF, DOCX, PPTX
          </Text>
        </>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title="Batal"
          onPress={onCancel}
          color="#6c757d"
          disabled={isLoading}
        />
        <Button
          title={material ? 'Update' : 'Unggah'}
          onPress={handleSubmit}
          disabled={isLoading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    marginBottom: 16,
  },
});
