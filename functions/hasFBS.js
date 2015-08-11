/**
* @param pt - the patient object that contains the hQuery patient API.
*
* @return - true if the patient has the condition documented, false otherwise.
*/
function hasFBS( pt, minDate, maxDate ){
    var system = "LOINC";
    var condition = "^14771-0$";

    return hasLab(pt, system, condition, minDate, maxDate);
}
