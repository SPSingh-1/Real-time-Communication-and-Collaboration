// import React from 'react'
import PropTypes from 'prop-types';

const Priority = (props) => {
  return (
    <span className={`flex items-center justify-center py-1 px-1 rounded-full text-[11px] capitalize ${props.priori === "Low" && 'bg-[#f00d09] text-white'}  ${props.priori === "Medium" && 'bg-[#e55f0b] text-white'}  ${props.priori === "High" && 'bg-green-700 text-white'}`} >{props.priori} </span>
  )
}

Priority.propTypes = {
    status: PropTypes.number.isRequired,
}

export default Priority;
