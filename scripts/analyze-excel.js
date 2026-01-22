const XLSX = require('xlsx');
const path = require('path');

// 엑셀 파일 경로
const filePath = path.join(__dirname, '../치험례/word/#이종대_선생님_치험례 6.000건.밴드 (2001.0.00-2025.10.24).xlsx');

console.log('엑셀 파일 분석 중...');
console.log('파일 경로:', filePath);

try {
  // 엑셀 파일 읽기
  const workbook = XLSX.readFile(filePath);

  console.log('\n=== 워크북 정보 ===');
  console.log('시트 이름들:', workbook.SheetNames);

  // 각 시트 분석
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n=== 시트 ${index + 1}: ${sheetName} ===`);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('총 행 수:', data.length);

    if (data.length > 0) {
      console.log('\n헤더 (첫 번째 행):');
      console.log(data[0]);

      console.log('\n샘플 데이터 (2-5번째 행):');
      for (let i = 1; i < Math.min(5, data.length); i++) {
        console.log(`행 ${i + 1}:`, data[i]);
      }

      // 컬럼 수 확인
      const maxCols = Math.max(...data.map(row => row ? row.length : 0));
      console.log('\n최대 컬럼 수:', maxCols);
    }
  });

} catch (error) {
  console.error('에러 발생:', error.message);
}
