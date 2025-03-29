import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db, collection, setDoc, doc, deleteDoc, onSnapshot, getDocs } from './firebaseConfig';

const BreakfastCheckin = () => {
  const [roomNumber, setRoomNumber] = useState('');
  const [numPeople, setNumPeople] = useState('');
  const [guestsData, setGuestsData] = useState([]);
  const [totalGuests, setTotalGuests] = useState(0);
  const [checkedInGuests, setCheckedInGuests] = useState(0);
  const [notArrivedGuests, setNotArrivedGuests] = useState([]);
  const [arrivedGuests, setArrivedGuests] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "breakfastGuests"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGuestsData(data);
      updateGuestStatistics(data);
    }, (error) => {
      console.error('Error fetching data:', error);
      // Nếu có lỗi, thử kết nối lại sau 1 giây
      setTimeout(() => {
        const unsubscribeRetry = onSnapshot(collection(db, "breakfastGuests"), (retrySnapshot) => {
          const retryData = retrySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setGuestsData(retryData);
          updateGuestStatistics(retryData);
        }, (retryError) => {
          console.error('Error retrying fetch data:', retryError);
        });
        
        return () => unsubscribeRetry(); // cleanup unsubscribeRetry
      }, 1000);  // Thử kết nối lại sau 1 giây
    });

    return () => unsubscribe();  // cleanup unsubscribe
  }, []);  // Chạy khi component mount

  const updateGuestStatistics = (data) => {
    const total = data.reduce((sum, guest) => sum + (guest.NumberOfPeople || 0), 0);
    setTotalGuests(total);

    const arrived = data.filter(guest => guest.status === 'arrived');
    setArrivedGuests(arrived);
    setCheckedInGuests(arrived.reduce((sum, guest) => sum + (guest.NumberOfPeople || 0), 0));

    const notArrived = data.filter(guest => guest.status !== 'arrived');
    setNotArrivedGuests(notArrived);
  };

  const readExcelFile = async (file) => {
    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const formattedData = jsonData.map(row => ({
        Room: row["__EMPTY"]?.toString().trim() || "",
        Name: row["__EMPTY_1"] || "",
        NumberOfPeople: row["__EMPTY_2"] ? parseInt(row["__EMPTY_2"]) : 0,
        Date: row["__EMPTY_4"] || new Date().toISOString(),
        status: "not_arrived",
      })).filter(guest => guest.Room && guest.NumberOfPeople > 0);

      setGuestsData(formattedData);
      await uploadDataToFirestore(formattedData);
    } catch (error) {
      console.error('Error reading Excel file:', error);
    }
  };

  const uploadDataToFirestore = async (data) => {
    try {
      const collectionRef = collection(db, "breakfastGuests");
      await deleteCollectionData(collectionRef);

      for (const guest of data) {
        await setDoc(doc(collectionRef, guest.Room), guest);
      }
    } catch (error) {
      console.error('Error uploading data:', error);
    }
  };

  const deleteCollectionData = async (collectionRef) => {
    const snapshot = await getDocs(collectionRef);
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  };

  const handleCheckIn = async () => {
    const guest = guestsData.find(g => g.Room === roomNumber.trim());
    if (!guest) return alert('朝食未購入');
    if (guest.status === 'arrived') return alert('朝食チェックイン済のお客様です');

    setNumPeople(guest.NumberOfPeople);
    // Show alert directly on check-in
    alert(`${guest.NumberOfPeople} 名様 （部屋 ${guest.Room}） チェックインしました。`);
    
    await setDoc(doc(db, "breakfastGuests", guest.Room), { status: 'arrived' }, { merge: true });
    setRoomNumber('');
    setNumPeople('');
  };

  const handleRefresh = async () => {
    try {
      await deleteCollectionData(collection(db, "breakfastGuests"));
      setGuestsData([]);
      setTotalGuests(0);
      setCheckedInGuests(0);
      setNotArrivedGuests([]);
      setArrivedGuests([]);
      alert("データがリフレッシュされました!");
      
      // Reload data after refresh
      const snapshot = await getDocs(collection(db, "breakfastGuests"));
      const refreshedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGuestsData(refreshedData);
      updateGuestStatistics(refreshedData);
    } catch (error) {
      console.error("Error during refresh:", error);
    }
  };

  return (
    <div>
      <h2>朝食チェックイン</h2>
      <input type="file" accept=".xlsx, .xls" onChange={(e) => readExcelFile(e.target.files[0])} />
      <button onClick={handleRefresh}>Refresh</button>
      <p>本日人数 {totalGuests} 名</p>
      <p>未到着人数 {totalGuests - checkedInGuests} 名</p>
      
      <input type="text" placeholder="部屋番号入力" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
      <button onClick={handleCheckIn}>ルームチェック</button>

      <h3>到着済 ({checkedInGuests} 名)</h3>
      <ul>
        {arrivedGuests.map(guest => (
          <li key={guest.id}>Room {guest.Room}: {guest.Name} - {guest.NumberOfPeople} 名 - {guest.Date}</li>
        ))}
      </ul>

      <h3>未到着 ({notArrivedGuests.reduce((sum, guest) => sum + guest.NumberOfPeople, 0)} 名)</h3>
      <ul>
        {notArrivedGuests.map(guest => (
          <li key={guest.id}>Room {guest.Room}: {guest.Name} - {guest.NumberOfPeople} 名 - {guest.Date}</li>
        ))}
      </ul>
    </div>
  );
};

export default BreakfastCheckin;
