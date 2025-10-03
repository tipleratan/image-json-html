// src/app/form-template.interface.ts

export interface KeyValueObject {
    [key: string]: string | string[] | KeyValueObject | undefined;
}

export interface FormTemplate {
    form_details: {
        form_type: string[];
        academy_name: string;
        academy_slogan: string;
        academy_type: string;
    };
    general_fields: KeyValueObject;
    personal_information: KeyValueObject;
    contact_details: KeyValueObject;
    signature_fields: KeyValueObject;
}