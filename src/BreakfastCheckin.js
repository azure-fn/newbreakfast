import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const BreakfastCheckin = () => {
  const [roomNumber, setRoomNumber] = useState('');
  const [numPeople, setNumPeople] = useState('');
  const [guestsData, setGuestsData] = useState([]); // Dữ liệu khách
  const [totalGuests, setTotalGuests] = useState(0); // Số khách còn lại sử dụng bữa sáng
  const [totalGuestsOfTheDay, setTotalGuestsOfTheDay] = useState(0); // Tổng số khách dùng bữa sáng trong ngày
  const [checkedInGuests, setCheckedInGuests] = useState(0); // Số khách đã check-in
  const [notArrivedGuests, setNotArrivedGuests] = useState([]); // Danh sách khách chưa đến
  const [arrivedGuests, setArrivedGuests] = useState([]); // Danh sách khách đã đến

  useEffect(() => {
    const loadExcelData = async () => {
      try {
        const fileUrl = 'https://docs.google.com/spreadsheets/d/12tUqfzccV8ffb-328eNDGFNgedKHycvxlB7X8e6gu28/export?format=xlsx';
        const response = await fetch(fileUrl);
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
  
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Change here to include header row as array
  
        // Clean up the data
        const cleanedData = jsonData.slice(1).map(row => ({
          Room: row[0],
          name: row[1],
          NumberOfPeople: row[2],
          Date: row[3],
        }));
  
        setGuestsData(cleanedData);
  
        // Check data in console
        console.log('Cleaned Data:', cleanedData);
  
        // Calculate total guests
        const total = cleanedData.reduce((acc, guest) => acc + (parseInt(guest.NumberOfPeople) || 0), 0);
        setTotalGuestsOfTheDay(total);
        setTotalGuests(total);
  
        // Filter not arrived guests and arrived guests
        const notArrived = cleanedData.filter((guest) => guest.status !== 'arrived');
        setNotArrivedGuests(notArrived);
  
        const arrived = cleanedData.filter((guest) => guest.status === 'arrived');
        setArrivedGuests(arrived);
      } catch (error) {
        console.error('Error loading Excel data:', error);
        alert('Không thể tải dữ liệu từ file Excel. Vui lòng kiểm tra lại file.');
      }
    };
  
    loadExcelData();
  }, []);
  

  const handleCheckIn = () => {
    // Ensure roomNumber exists and is valid
    if (!roomNumber) {
      alert('部屋番号を入力してください');
      return;
    }
    
    const guest = guestsData.find((g) => g.Room && g.Room.toString() === roomNumber.trim());
    
    if (guest) {
      if (guest.status === 'arrived') {
        alert('朝食チェックイン済のお客様です');
      } else {
        setNumPeople(guest.NumberOfPeople);
      }
    } else {
      alert('朝食未購入');
    }
  };
  

  const handleConfirmCheckIn = () => {
    if (roomNumber && numPeople) {
      const updatedGuests = guestsData.map((g) => {
        if (g.Room && g.Room.toString() === roomNumber.trim() && g.NumberOfPeople) {
          return { ...g, status: 'arrived' };
        }
        return g; // Return the guest unchanged if Room or NumberOfPeople is missing
      });
  
      setGuestsData(updatedGuests);
      setCheckedInGuests((prevCheckedIn) => prevCheckedIn + parseInt(numPeople));
      setTotalGuests((prevTotal) => prevTotal - parseInt(numPeople));
  
      const notArrived = updatedGuests.filter((guest) => guest.status !== 'arrived');
      setNotArrivedGuests(notArrived);
      const arrived = updatedGuests.filter((guest) => guest.status === 'arrived');
      setArrivedGuests(arrived);
  
      alert(`${numPeople} 名様 （部屋 ${roomNumber}）　チェックインしました.`);
  
      setRoomNumber('');
      setNumPeople('');
    } else {
      alert('部屋番号または人数が未入力です');
    }
  };
  
  return (
    <div className="checkin-container">
      <h2>朝食チェックイン</h2>
      <div>
        <p>本日人数 {totalGuestsOfTheDay} 名</p>
        <p>未到着人数 {totalGuests} 名</p>
      </div>

      <div>
        <input
          type="text"
          placeholder="部屋番号入力"
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
        />
        <button onClick={handleCheckIn}>ルームチェック</button>
      </div>

      {numPeople && (
        <div>
          <p>ルーム{roomNumber}： {numPeople} 名</p>
          <button onClick={handleConfirmCheckIn}>朝食チェックイン</button>
        </div>
      )}

<div className="checkin-stats">
  <div>
    <h3>到着済 ({checkedInGuests} 名)</h3>
    <ul>
      {arrivedGuests.length > 0 ? (
        arrivedGuests.map((guest, index) => (
          <li key={index}>
            部屋番号 {guest.Room} - {guest.name}: {guest.NumberOfPeople} 名
          </li>
        ))
      ) : (
        <li>まだ到着していないお客様はありません。</li>
      )}
    </ul>
  </div>

  <div>
    <h3>未到着 ({totalGuests - checkedInGuests} 名)</h3>
    <ul>
      {notArrivedGuests.length > 0 ? (
        notArrivedGuests.slice(1).map((guest, index) => {
          // Only render guests with valid room number and number of people
          if (guest.Room && guest.NumberOfPeople) {
            return (
              <li key={index}>
                部屋番号 {guest.Room} - {guest.name}: {guest.NumberOfPeople} 名
              </li>
            );
          }
          return null; // Skip rendering if data is incomplete
        })
      ) : (
        <li>まだ到着していないお客様はありません。</li>
      )}
    </ul>
  </div>
</div>
    </div>
  );
};

export default BreakfastCheckin;
