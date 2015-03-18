/**
* Query Title: PDC-027
* Query Type:  Ratio
* Description: LDL >= 2.5 mmol/L in last year / for patients with diabetes
*/
function map( patient ){
  /**
  * Denominator
  *
  * Base criteria:
  *   - diagnosed with diabetes
  */
  function checkDenominator(){
    // Coded entry lists
    var conList       = patient.conditions(),

    // Medical codes
        conCodes      ={ "ICD9"      :[ "^250" ]},  // Diabetes, types 1 and 2
                                                    // http://www.cms.gov/medicare-coverage-database/staticpages/icd-9-code-lookup.aspx?KeyWord=diabetes
    // Filters
        conditions    = filter_general( conList, conCodes );

    // Inclusion/exclusion
    return isMatch( conditions );
  }


  /**
  * Numerator
  *
  * Additional criteria:
  *   - LDL recorded
  *   ---> LDL >= 2.5 mmol/L
  *   ---> in last six months
  */
  function checkNumerator(){
    // Values
    //   - ages and min/max values
    var resMin   = 2.4999,

    // Dates
    //   - end:   () for current date, otherwise ( YYYY, MM, DD )
    //   - start: subtract from end as Y, M, D
        end      = new Date(),
        resStart = new Date( end.getFullYear() - 1, end.getMonth(), end.getDate() ),

    // Lists
        resList  = patient.results(),

    // Medical codes - http://search.loinc.org/search.zul?query=%22Cholesterol.in+LDL%22+-HDL
        resCodes ={ "pCLOCD"    :[ "22748-8",    // Cholesterol in LDL [Moles/​volume] in Serum or Plasma
                                   "39469-2",    // Cholesterol in LDL [Moles/​volume] in Serum or Plasma by calculation
                                   "53133-5",    // Cholesterol in LDL [Moles/​volume] in Body fluid
                                   "69419-0" ]}, // Cholesterol in LDL [Moles/​volume] in Serum or Plasma by Direct assay

    // Filters
        results       = filter_general( resList, resCodes, resMin, resStart );

    // Inclusion/exclusion
    return isMatch( results );
  }


  /**
  * Emit Numerator and Denominator:
  *   - numerator must also be in denominator
  *   - tagged with physician ID
  */
  var denominator = checkDenominator(),
      numerator   = denominator && checkNumerator(),
      physicianID = "_" + patient.json.primary_care_provider_id;

  emit( "denominator" + physicianID, denominator );
  emit( "numerator"   + physicianID, numerator   );
}


/*******************************************************************************
* Helper Functions                                                             *
*   These should be the same for all queries.  Copy a fresh set on every edit! *
*******************************************************************************/


/**
* Filters a list of lab results:
*   - lab, medication and condition codes (e.g. pCLOCD, whoATC, HC-DIN)
*   - minimum and maximum values
*   --> exclusive range, boundary cases are excluded
*   - start and end dates
*/
function filter_general( list, codes, p1, p2, p3, p4 ){
  // Default variables = undefined
  var min, max, start, end, filteredList;

  // Check parameters, which can be dates or scalars (numbers)
  if(( p1 instanceof Date )&&( p2 instanceof Date )){
    start = p1;
    end   = p2;
    min   = p3;
    max   = p4;
  }
  else if(( p1 instanceof Date )&&( typeof p2 === 'number' )){
    start = p1;
    min   = p2;
    max   = p3;
  }
  else if(( typeof p1 === 'number' )&&( typeof p2 === 'number' )){
    min   = p1;
    max   = p2;
    start = p3;
    end   = p4;
  }
  else if(( typeof p1 === 'number' )&&( p2 instanceof Date )){
    min   = p1;
    start = p2;
    end   = p3;
  }

  // Use API's match functions to filter based on codes and dates
  //   - Immunizations, medications and results use an exact code match
  //   - Conditions use a regex match, so make sure to preface with '\\b'!
  if(( list[0] )&&( list[0].json._type === 'Condition' ))
    filteredList = list.regex_match( codes, start, end );
  else
    filteredList = list.match( codes, start, end );

  // If there are scalar values (min/max), then filter with them
  if( typeof min === 'number' ){
    // Default value
    max = max || 1000000000;
    filteredList = filter_values( filteredList, min, max );
  }

  return filteredList;
}


/**
* Filters a list of medications:
*   - active status only (20% pad on time interval)
*/
function filter_activeMeds( matches ){
  var now      = new Date(),
      toReturn = new hQuery.CodedEntryList();

  for( var i = 0, L = matches.length; i < L; i++ ){
    var drug  = matches[ i ],
        start = drug.indicateMedicationStart().getTime(),
        pad   =( drug.indicateMedicationStop().getTime() - start )* 1.2,
        end   = start + pad;

    if( start <= now && now <= end )
      toReturn.push( drug );
  }
  return toReturn;
}


/**
* Used by filter_general() and filter_general()
*   --> exclusive range, boundary cases are excluded
*/
function filter_values( list, min, max ){
  // Default value
  max = max || 1000000000;

  var toReturn = new hQuery.CodedEntryList();

  // Builds a set with values meeting min/max
  for( var i = 0, L = list.length; i < L; i++ ){
    var entry  = list[ i ],
        scalar = entry.values()[0].scalar();

    if( min < scalar && scalar < max )
      toReturn.push( entry );
  }
  return toReturn;
}


/**
* T/F: Does a filtered list contain matches (/is not empty)?
*/
function isMatch( list ) {
  return 0 < list.length;
}


/**
* T/F: Does the patient fall in this age range?
*/
function isAge( ageMin, ageMax ) {
  // Default values
  ageMax = ageMax || 200;

  ageNow = patient.age( new Date() );
  return ( ageMin <= ageNow && ageNow <= ageMax );
}


/*******************************************************************************
* Debugging Functions                                                          *
*   These are badly commented, non-optimized and intended for development.     *
*******************************************************************************/


/**
* Substitute for filter_general() to troubleshoot values
*/
function emit_filter_general( list, codes, min, max ){
  var filtered = list.match( codes );

  if( typeof min === 'number' )
    filtered = filter_values( filtered, min,( max || 1000000000 ));

  emit_values( filtered, min, max );

  return filtered;
}


/**
* Used by emit_filter_general() to emit age, ID and values
*/
function emit_values( list, min, max ){
  for( var i = 0, L = list.length; i < L; i++ ){

    if( list[ i ].values()[0] ){
      var scalar = list[ i ].values()[0].scalar();

      scalar = scalarToString( scalar );
      var units  = " " + list[ i ].values()[0].units(),
          age    = " -- " + scalarToString( patient.age ( new Date() )),
          first  = " -- " + patient.json.first.substr( 1, 5 );
      emit( scalar + units + age + first, 1 );
    }
  }
}


/**
* Round a scalar (or int) and convert to string, otherwise string emit crashes
*/
function scalarToString( scalar ){
  return Math.floor( scalar.toString() );
}
