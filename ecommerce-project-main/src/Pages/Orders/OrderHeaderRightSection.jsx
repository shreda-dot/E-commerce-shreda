import React from "react";

const OrderHeaderRightSection = ({order}) => {
  return (
    <>
      <div className="order-header-right-section">
        <div className="order-header-label">Order ID:</div>
        <div>{order.id}</div>
      </div>
    </>
  );
};

export default OrderHeaderRightSection;
