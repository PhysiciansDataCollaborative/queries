// Reference Number: PDC-008
// Query Title: BMI or WC documented in last 2 yrs, age 12-18

function map( patient ){
  // Store physician ID, via JSON key
  var pid = "_" + patient.json.primary_care_provider_id;

  // Denominator: age range
  var ageMin = 12,
      ageMax = 18;

  // Target: list of recorded vital signs, desired target codes
  var tgtList = patient.vitalSigns(),
      tgtWC ={ "LOINC": ["56115-9"] },        // Waist circumference
      tgtBM ={ "LOINC": ["39156-5"] },        // BMI
      tgtHt ={ "LOINC": ["8302-2"]  },        // Height
      tgtWt ={ "LOINC": ["3141-9"]  };        // Weight

  // Target dates: ends now, starts two years ago
  var end   = new Date(),
      start = new Date( end.getFullYear() - 2, end.getMonth(), end.getDate() );

  // 1 or 0: patient in our age range?
  function checkDenominator(){
    var age = patient.age( end );
    return ageMin <= age && age <= ageMax;
  }

  // 1 or 0: recorded waist circumference || BMI || (height && weight)?
  function checkTarget(){
    var hasWC = tgtList.match( tgtWC, start, end ).length,
        hasBM = tgtList.match( tgtBM, start, end ).length,
        hasHt = tgtList.match( tgtHt, start, end ).length,
        hasWt = tgtList.match( tgtWt, start, end ).length;
    return hasWC || hasBM ||( hasHt && hasWt );
  }

  // Numerator must be a member of denominator and target groups
  var inDen = checkDenominator(),
      inNum = inDen && checkTarget();
  emit( "denominator" + pid, inDen );
  emit( "numerator"   + pid, inNum );
}
