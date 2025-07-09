// import React from 'react'
import PropTypes from 'prop-types';

const Status = (props) => {
  return (
    <span className={`flex items-center justify-center py-1 px-1 rounded-full text-[11px] capitalize ${props.status === "To Do" && 'bg-[#071b73] text-white'} ${props.status === "In Progress" && 'bg-[#420554] text-white'}  ${props.status === "Complete" && 'bg-[#095721] text-white'}  ${props.status === "Blocked" && 'bg-red-600 text-white'}`} >{props.status} </span>
  )
}

Status.propTypes = {
    status: PropTypes.number.isRequired,
}

export default Status;
