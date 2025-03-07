import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db, collection, setDoc, doc, deleteDoc, onSnapshot } from './firebaseConfig';

const BreakfastCheckin = () => {
  const [roomNumber, setRoomNumber] = useState('');
  const [numPeople, setNumPeople] = useState('');
  const [guestsData, setGuestsData] = useState([]);
  const [totalGuestsOfTheDay, setTotalGuestsOfTheDay] = useState(0);
  const [checkedInGuests, setCheckedInGuests] = useState(0);
  const [notArrivedGuests, setNotArrivedGuests] = useState([]);
  const [arrivedGuests, setArrivedGuests] = useState([]);

  // Đọc dữ liệu từ Firestore với onSnapshot để theo dõi thay đổi thời gian thực
  const fetchGuestsFromFirestore = () => {
    const collectionRef = collection(db, "breakfastGuests");

    // Lắng nghe dữ liệu từ Firestore
    const unsubscribe = onSnapshot(collectionRef, (querySnapshot) => {
      const loadedData = querySnapshot.docs.map(doc => doc.data());

      console.log('Dữ liệu từ Firestore:', loadedData); // Kiểm tra dữ liệu có tải về không

      setGuestsData(loadedData);

      const total = loadedData.reduce((acc, guest) => acc + (parseInt(guest.NumberOfPeople) || 0), 0);
      setTotalGuestsOfTheDay(total);

      const notArrived = loadedData.filter(guest => guest.status !== 'arrived');
      setNotArrivedGuests(notArrived);
      console.log('Danh sách chưa đến:', notArrived);

      const arrived = loadedData.filter(guest => guest.status === 'arrived');
      setArrivedGuests(arrived);
    }, (error) => {
      console.error('Lỗi khi lấy dữ liệu từ Firestore:', error);
    });

    // Trả về hàm unsubscribe để ngừng lắng nghe khi component unmount
    return unsubscribe;
  };

  useEffect(() => {
    // Khởi động việc lắng nghe dữ liệu khi component được render
    const unsubscribe = fetchGuestsFromFirestore();

    // Clean up listener khi component unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Hàm đọc dữ liệu từ Excel
  const readExcelFile = async (file) => {
    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('Excel file data:', jsonData);

      const formattedData = transformExcelData(jsonData);
      console.log("Dữ liệu đã xử lý:", formattedData);

      // Cập nhật state để hiển thị ngay trên UI
      setGuestsData(formattedData);
      setTotalGuestsOfTheDay(formattedData.reduce((acc, guest) => acc + (parseInt(guest.NumberOfPeople) || 0), 0));

      // Sau khi set state, tiến hành lưu vào Firestore
      await uploadDataToFirestore(formattedData);

      // Sau khi upload, load lại dữ liệu từ Firestore
      await fetchGuestsFromFirestore();

    } catch (error) {
      console.error('Error reading Excel file:', error);
    }
  };

  // Chuyển đổi dữ liệu Excel
  const transformExcelData = (rawData) => {
    return rawData.map(row => ({
      Room: row["__EMPTY"] ? row["__EMPTY"].toString().trim() : "",
      Name: row["__EMPTY_1"] || "",
      NumberOfPeople: row["__EMPTY_2"] ? parseInt(row["__EMPTY_2"]) : 0,
      BookingID: row["__EMPTY_3"] || "",
      Date: row["__EMPTY_4"] || "",  // Thêm cột Date
    })).filter(guest => guest.Room && guest.NumberOfPeople > 0); // Lọc bỏ dòng trống
  };

  // Lưu dữ liệu vào Firestore
  const uploadDataToFirestore = async (data) => {
    try {
      console.log("Dữ liệu chuẩn bị upload:", data);

      const collectionRef = collection(db, "breakfastGuests");

      // Xóa dữ liệu cũ trong collection (nếu cần)
      await deleteCollectionData(collectionRef);

      // Duyệt qua từng guest và thêm thông tin vào Firestore
      for (const guest of data) {
        console.log("Đang xử lý:", guest);

        // Kiểm tra thông tin có hợp lệ không
        if (guest.Room && guest.NumberOfPeople) {
          await setDoc(doc(collectionRef, guest.Room.toString()), {
            Room: guest.Room,
            NumberOfPeople: guest.NumberOfPeople,
            Name: guest.Name || "",
            Date: guest.Date || new Date().toISOString(),  // Sử dụng ngày hiện tại nếu không có Date
            status: "not_arrived",
          });
        } else {
          console.warn("Bỏ qua guest không hợp lệ:", guest);
        }
      }

      console.log("Dữ liệu đã được tải lên Firestore!");

      // Gọi lại fetchGuestsFromFirestore để cập nhật giao diện
      await fetchGuestsFromFirestore();

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu lên Firestore:", error);
    }
  };

  // Xóa dữ liệu trong Firestore trước khi tải mới
  const deleteCollectionData = async (collectionRef) => {
    try {
      const querySnapshot = await getDocs(collectionRef);
      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log("Đã xóa dữ liệu cũ.");
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu:", error);
    }
  };

  // Xử lý Check-in
  const handleCheckIn = () => {
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

  // Xác nhận Check-in và cập nhật Firestore
  const handleConfirmCheckIn = async () => {
    if (roomNumber && numPeople) {
      const updatedGuests = guestsData.map((g) => {
        if (g.Room && g.Room.toString() === roomNumber.trim() && g.NumberOfPeople) {
          return { ...g, status: 'arrived' };
        }
        return g;
      });

      setGuestsData(updatedGuests);
      setCheckedInGuests((prevCheckedIn) => prevCheckedIn + parseInt(numPeople));

      const notArrived = updatedGuests.filter((guest) => guest.status !== 'arrived');
      setNotArrivedGuests(notArrived);

      const arrived = updatedGuests.filter((guest) => guest.status === 'arrived');
      setArrivedGuests(arrived);

      // Cập nhật Firestore
      try {
        await setDoc(doc(db, "breakfastGuests", roomNumber), {
          Room: roomNumber,
          NumberOfPeople: numPeople,
          status: 'arrived'
        }, { merge: true });

        alert(`${numPeople} 名様 （部屋 ${roomNumber}）　チェックインしました.`);
      } catch (error) {
        console.error('Error updating Firestore:', error);
      }

      setRoomNumber('');
      setNumPeople('');
    } else {
      alert('部屋番号または人数が未入力です');
    }
  };

  // Hàm refresh dữ liệu
  const handleRefresh = async () => {
    // Xóa dữ liệu trên Firestore
    await deleteCollectionData(collection(db, "breakfastGuests"));
    
    // Xóa dữ liệu trên giao diện
    setGuestsData([]); // Xóa danh sách khách trên giao diện
    setTotalGuestsOfTheDay(0);
    setCheckedInGuests(0);
    setNotArrivedGuests([]);
    setArrivedGuests([]);
    setRoomNumber('');
    setNumPeople('');
  
    alert("Dữ liệu đã được xóa và làm mới!");
  };

  return (
    <div className="checkin-container">
      <h2>朝食チェックイン</h2>

      {/* Nút tải lên file */}
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={(e) => readExcelFile(e.target.files[0])}
      />
      <br />

      {/* Nút refresh */}
      <button onClick={handleRefresh}>Refresh</button>

      {/* Nút để hiển thị dữ liệu */}
      <br />
      <button onClick={fetchGuestsFromFirestore}>Load Data</button>

      <div>
        <p>本日人数 {totalGuestsOfTheDay} 名</p>
        <p>未到着人数 {totalGuestsOfTheDay - checkedInGuests} 名</p>
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
        <h3>到着済 ({checkedInGuests} 名)</h3>
        <ul>
          {arrivedGuests.map((guest, index) => (
            <li key={index}>
              Room {guest.Room}: {guest.Name} 様 - {guest.NumberOfPeople} 名 - {guest.Date} {/* Thêm cột Date */}
            </li>
          ))}
        </ul>
      </div>

      <div className="checkin-stats">
        <h3>未到着 ({notArrivedGuests.reduce((acc, guest) => acc + (parseInt(guest.NumberOfPeople) || 0), 0)} 名)</h3>
        <ul>
          {notArrivedGuests.map((guest, index) => (
            <li key={index}>
              Room {guest.Room}: {guest.Name} 様 - {guest.NumberOfPeople} 名 - {guest.Date} {/* Thêm cột Date */}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
};

export default BreakfastCheckin;
