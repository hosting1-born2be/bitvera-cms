import type { CollectionConfig, PayloadRequest } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: {
    forgotPassword: {
      generateEmailHTML: (args?: { token?: string }) => {
        const resetLink = `${process.env.WEB_FRONT_URL}/set-password?token=${args?.token}`;

        return `
          <div style="background-color: white;font-family: sans-serif; line-height: 1.5;width:640px;margin:0 auto;">
            <img src="${process.env.WEB_FRONT_URL}/images/email-header.png" alt="Bitvera Logo" style="width: 100%; height: auto;" />
            <div style="padding: 32px;">
              <h2 style="color: #333;font-size: 24px;font-style: normal;font-weight: 400;line-height: 140%;">Password Reset Request</h2>
              <p style="margin-bottom: 32px;color: #333;font-size: 16px;font-style: normal;font-weight: 400;line-height: 140%;">You requested a password reset. Click the button below to reset your password.</p>
              <p><a href="${resetLink}" style="color: #FFF;
font-size: 16px;
font-style: normal;
font-weight: 400;
line-height: 140%;
padding: 10px 16px 10px 16px;
border-radius: 4px;
background: #384CE3;
text-decoration: none;
">Reset Password</a></p>
              <p style="margin-top: 32px;color: #333;font-size: 16px;font-style: normal;font-weight: 400;line-height: 140%;">If you didn’t request this, just ignore this email.</p>
            </div>
            <img src="${process.env.WEB_FRONT_URL}/images/email-footer.png" alt="Bitvera Logo" style="width: 100%; height: auto;" />
          </div>  
        `;
      },
    },
  },
  access: {
    /*read: function (args: { req: PayloadRequest }) {
      return args.req.user?.role === 'admin'
    },*/
    read: () => true,
    create: () => true,
    update: () => true,
  },
  fields: [
    {
      name: "firstName",
      type: "text",
      label: "First Name",
      required: true,
    },
    {
      name: "lastName",
      type: "text",
      label: "Last Name",
      required: true,
    },
    {
      name: "username",
      type: "text",
      label: "Username",
      required: false,
    },
    {
      name: "phone",
      type: "text",
      label: "Phone",
      required: false,
    },
    {
      name: "address1",
      type: "text",
      label: "Address line 1",
      required: false,
    },
    {
      name: "address2",
      type: "textarea",
      label: "Address line 2",
      required: false,
    },
    {
      name: "city",
      type: "text",
      label: "City",
      required: false,
    },
    {
      name: "state",
      type: "text",
      label: "State",
      required: false,
    },
    {
      name: "zip",
      type: "text",
      label: "Zip Code",
      required: false,
    },
    {
      name: "country",
      type: "text",
      label: "Country",
      required: false,
    },
    {
      name: "role",
      type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Customer", value: "customer" },
      ],
      defaultValue: "customer",
      required: true,
    },
  ],
};
