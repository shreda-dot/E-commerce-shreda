import React from "react";
import dayjs from "dayjs";
import { FormatMoney } from "../../utility/money";

const OrderLeftSection = ({order}) => {
  return (
    <>
      <div className="order-header-left-section">
        <div className="order-date">
          <div className="order-header-label">Order Placed:</div>
          <div>{dayjs(order.orderTimeMs).format("MMMM,  D")}</div>
        </div>
        <div className="order-total">
          <div className="order-header-label">Total:</div>
          <div>{FormatMoney(order.totalCostCents)}</div>
        </div>
      </div>
    </>
  );
};

export default OrderLeftSection;
