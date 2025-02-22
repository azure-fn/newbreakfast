import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const BreakfastCheckin = () => {
  const [roomNumber, setRoomNumber] = useState('');
  const [numPeople, setNumPeople] = useState('');
  const [guestsData, setGuestsData] = useState([]);
  const [totalGuests, setTotalGuests] = useState(0); // Số khách còn lại sử dụng bữa sáng
  const [totalGuestsOfTheDay, setTotalGuestsOfTheDay] = useState(0); // Tổng khách dùng bữa sáng trong ngày
  const [checkedInGuests, setCheckedInGuests] = useState(0); // Số khách đã check-in
  const [notArrivedGuests, setNotArrivedGuests] = useState([]); // Danh sách khách chưa đến

  const response = await fetch(window.location.origin + "/guests.xlsx");
  
      const data = await response.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      setGuestsData(jsonData);

      // Tính tổng số khách sử dụng bữa sáng trong ngày
      const total = jsonData.reduce((acc, guest) => acc + guest.NumberOfPeople, 0);
      setTotalGuestsOfTheDay(total);  // Cập nhật tổng số khách sử dụng bữa sáng trong ngày

      // Cập nhật tổng số khách còn lại sử dụng bữa sáng (bằng tổng khách ban đầu)
      setTotalGuests(total); // Khởi tạo số khách còn lại bằng tổng khách sử dụng bữa sáng

      // Lọc khách chưa đến
      const notArrived = jsonData.filter((guest) => guest.status !== 'arrived');
      setNotArrivedGuests(notArrived);
    };

    loadExcelData();
  }, []);

  const handleCheckIn = () => {
    const guest = guestsData.find((g) => g.Room.toString() === roomNumber.trim());
    if (guest) {
      setNumPeople(guest.NumberOfPeople);
    } else {
      alert('朝食未購入');
    }
  };

  const handleConfirmCheckIn = () => {
    if (roomNumber && numPeople) {
      // Cập nhật trạng thái check-in của khách
      const updatedGuests = guestsData.map((g) =>
        g.Room.toString() === roomNumber.trim() ? { ...g, status: 'arrived' } : g
      );

      // Cập nhật lại danh sách khách
      setGuestsData(updatedGuests);

      // Cập nhật số khách đã check-in
      setCheckedInGuests((prevCheckedIn) => prevCheckedIn + numPeople);

      // Giảm tổng số khách breakfast
      setTotalGuests((prevTotal) => prevTotal - numPeople);

      // Lọc lại danh sách khách chưa đến sau khi có khách check-in
      const notArrived = updatedGuests.filter((guest) => guest.status !== 'arrived');
      setNotArrivedGuests(notArrived);

      alert(`${numPeople} 名様 （部屋 ${roomNumber}）　チェックインしました.`);

      // Reset lại input
      setRoomNumber('');
      setNumPeople('');
    }
  };

  return (
    <div className="checkin-container">
      <h2>朝食チェックイン</h2>
      {/* Hiển thị thông tin tổng số khách */}
      <div>
        <p>本日人数{totalGuestsOfTheDay}</p> {/* Số khách sử dụng bữa sáng trong ngày */}
        <p>未到着人数 {totalGuests}</p> {/* Số khách còn lại sử dụng bữa sáng */}
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

      {/* Số khách chưa đến được tính tự động */}
      <div>
        <h3>未到着のお客様： ({totalGuestsOfTheDay - checkedInGuests} 名)</h3>
      </div>

      {/* Hiển thị danh sách khách chưa đến */}
      {notArrivedGuests.length > 0 && (
        <div>
  
          <ul>
            {notArrivedGuests.map((guest, index) => (
              <li key={index}>
                部屋番号 {guest.Room} - {guest.Name}: {guest.NumberOfPeople} 名
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BreakfastCheckin;
