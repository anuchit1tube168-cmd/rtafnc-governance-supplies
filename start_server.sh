#!/bin/bash
PORT=8080

echo "=========================================================="
echo " ระบบบริหารจัดการพัสดุปกครอง ๑ ๒ ๓ — วพอ.พอ."
echo " กำลังเปิดเซิร์ฟเวอร์ที่ http://localhost:$PORT"
echo "=========================================================="

if which open > /dev/null; then
  sleep 1 && open "http://localhost:$PORT" &
fi

python3 -m http.server $PORT
