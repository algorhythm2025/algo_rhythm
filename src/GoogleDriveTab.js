import React, { useEffect, useState } from 'react';
import GoogleDriveService from './services/googleDriveService';

const driveService = new GoogleDriveService();

function GoogleDriveTab() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      await driveService.initializeGapi();
      await driveService.initializeGis();
      await driveService.requestToken();
      const fileList = await driveService.listFiles(20);
      setFiles(fileList);
    } catch (err) {
      setError(driveService.formatErrorMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>구글 드라이브 파일 목록</h2>
      {loading && <p>불러오는 중...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            <strong>{file.name}</strong> ({file.mimeType})<br />
            생성일: {file.createdTime}<br />
            수정일: {file.modifiedTime}<br />
            크기: {file.size ? file.size + ' bytes' : '폴더 또는 알 수 없음'}
          </li>
        ))}
      </ul>
      {files.length === 0 && !loading && !error && <p>표시할 파일이 없습니다.</p>}
    </div>
  );
}

export default GoogleDriveTab; 