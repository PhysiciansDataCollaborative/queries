/**
 * Query Title: TEST-000
 * Query Type:  Count
 * Description: Count all patients, very basic testing only
 */
function map( patient )
{
  numerator = activePatient( patient );
  emit( "records", numerator );
}
